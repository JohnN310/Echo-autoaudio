import AVFoundation
import Foundation
import Speech

// The tap runs on an audio thread. Switching speech requests must not stop the
// engine or race request.append(). Buffer briefly while Apple finalizes a task.
private final class SpeechInput {
  private let lock = NSLock()
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var pending: [AVAudioPCMBuffer] = []
  private var duration: Double = 0
  private var enabled = false

  func use(_ next: SFSpeechAudioBufferRecognitionRequest?) {
    lock.lock(); defer { lock.unlock() }
    enabled = true
    request = next
    if let next {
      pending.forEach { next.append($0) }
      pending.removeAll()
      duration = 0
    }
  }

  func append(_ buffer: AVAudioPCMBuffer) {
    lock.lock(); defer { lock.unlock() }
    guard enabled else { return }
    if let request { request.append(buffer); return }
    guard let copy = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: buffer.frameLength) else { return }
    copy.frameLength = buffer.frameLength
    let source = UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: buffer.audioBufferList))
    let destination = UnsafeMutableAudioBufferListPointer(copy.mutableAudioBufferList)
    for index in 0..<source.count {
      if let from = source[index].mData, let to = destination[index].mData {
        memcpy(to, from, Int(source[index].mDataByteSize))
      }
    }
    pending.append(copy)
    duration += Double(copy.frameLength) / copy.format.sampleRate
    while duration > 2, !pending.isEmpty {
      let first = pending.removeFirst()
      duration -= Double(first.frameLength) / first.format.sampleRate
    }
  }

  func clear() {
    lock.lock(); defer { lock.unlock() }
    enabled = false
    request = nil
    pending.removeAll()
    duration = 0
  }
}

// All control state is confined to the main queue. AVAudioEngine persists for
// the entire opt-in session, even while playback is paused or JS is backgrounded.
final class EchoMicrophone {
  private let emit: (String, [String: Any]) -> Void
  private let input = SpeechInput()
  private var engine: AVAudioEngine?
  private var recognizer: SFSpeechRecognizer?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var requestID = UUID()
  private var active = false
  private var finishing = false
  private var consumed = ""
  private var lastText = ""
  private var utteranceID = 0
  private var quietTimer: Timer?
  private var rotationTimer: Timer?
  private var finalTimer: Timer?
  private var restartTimer: Timer?
  private var observers: [NSObjectProtocol] = []
  private var shortFailures = 0
  private var requestStarted = Date()

  init(emit: @escaping (String, [String: Any]) -> Void) { self.emit = emit }
  var state: String { active ? "recognizing" : "inactive" }

  func start() throws {
    dispatchPrecondition(condition: .onQueue(.main))
    guard !active else { return }
    guard AVAudioSession.sharedInstance().recordPermission == .granted,
      let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")),
      recognizer.isAvailable, recognizer.supportsOnDeviceRecognition else {
      throw NSError(domain: "EchoVoice", code: 1, userInfo: [NSLocalizedDescriptionKey: "Offline English recognition or microphone permission is unavailable."])
    }
    self.recognizer = recognizer
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
    try session.setActive(true)
    let engine = AVAudioEngine()
    do {
      // Voice processing changes the hardware format: enable it BEFORE reading
      // that format or connecting/installing taps. Never silently disable AEC.
      try engine.inputNode.setVoiceProcessingEnabled(true)
      let format = engine.inputNode.outputFormat(forBus: 0)
      guard format.sampleRate > 0, format.channelCount > 0 else {
        throw NSError(domain: "EchoVoice", code: 2, userInfo: [NSLocalizedDescriptionKey: "The microphone input is unavailable."])
      }
      engine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [input] buffer, _ in
        input.append(buffer)
      }
      self.engine = engine
      active = true
      shortFailures = 0
      openRequest()
      engine.prepare()
      try engine.start()
      observeSession()
      emit("voiceStart", [:])
    } catch {
      stop(emitEnd: false)
      throw error
    }
  }

  func stop(emitEnd: Bool = true) {
    dispatchPrecondition(condition: .onQueue(.main))
    let wasActive = active
    active = false
    requestID = UUID() // Ignore callbacks from tasks canceled below.
    [quietTimer, rotationTimer, finalTimer, restartTimer].forEach { $0?.invalidate() }
    quietTimer = nil; rotationTimer = nil; finalTimer = nil; restartTimer = nil
    input.clear()
    request?.endAudio()
    task?.cancel()
    request = nil; task = nil
    engine?.inputNode.removeTap(onBus: 0)
    engine?.stop()
    engine = nil
    observers.forEach { NotificationCenter.default.removeObserver($0) }
    observers.removeAll()
    recognizer = nil
    // Playback owns session restoration; do not deactivate ongoing audio here.
    if emitEnd && wasActive { emit("voiceEnd", [:]) }
  }

  private func openRequest() {
    guard active, let recognizer else { return }
    [quietTimer, rotationTimer, finalTimer, restartTimer].forEach { $0?.invalidate() }
    requestID = UUID()
    let id = requestID
    input.use(nil)
    task?.cancel()
    consumed = ""; lastText = ""; finishing = false
    requestStarted = Date()
    let request = SFSpeechAudioBufferRecognitionRequest()
    request.requiresOnDeviceRecognition = true
    request.shouldReportPartialResults = true
    request.contextualStrings = ["Hey Echo", "play", "pause", "skip", "go back", "save", "follow", "cancel"]
    self.request = request
    task = recognizer.recognitionTask(with: request) { [weak self] result, error in
      DispatchQueue.main.async {
        guard let self, self.active, self.requestID == id else { return }
        self.receive(result, error: error)
      }
    }
    input.use(request)
    rotationTimer = Timer.scheduledTimer(withTimeInterval: 50, repeats: false) { [weak self] _ in
      self?.finishRequest()
    }
  }

  private func normalized(_ text: String) -> String {
    text.lowercased().replacingOccurrences(of: "[.,!?;:]", with: "", options: .regularExpression)
      .split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
  }

  private func receive(_ result: SFSpeechRecognitionResult?, error: Error?) {
    if let result {
      let full = normalized(result.bestTranscription.formattedString)
      // Apple's continuous results can accumulate earlier finalized utterances.
      let text: String
      if !consumed.isEmpty && full == consumed { text = "" }
      else if !consumed.isEmpty && full.hasPrefix(consumed + " ") {
        text = String(full.dropFirst(consumed.count + 1))
      } else { text = full }
      var final = result.isFinal
      if #available(iOS 18.0, *), !final {
        final = (result.speechRecognitionMetadata?.speechDuration ?? 0) > 0
      }
      if !text.isEmpty {
        emit("voiceResult", ["transcript": text, "isFinal": final, "utteranceId": utteranceID])
        if final {
          consumed = full
          utteranceID += 1
          quietTimer?.invalidate()
        } else if full != lastText && !finishing {
          quietTimer?.invalidate()
          quietTimer = Timer.scheduledTimer(withTimeInterval: 1.2, repeats: false) { [weak self] _ in
            self?.finishRequest()
          }
        }
        lastText = full
        shortFailures = 0
      }
      if result.isFinal { openRequest(); return }
    }
    if let error {
      let native = error as NSError
      // Apple can finish a long-running/no-speech task. Renew the speech request
      // natively, keeping the tap and capture session alive and buffering input.
      if native.domain == "kAFAssistantErrorDomain" && [1110, 1101, 1107].contains(native.code) {
        shortFailures = Date().timeIntervalSince(requestStarted) < 5 ? shortFailures + 1 : 0
        if shortFailures < 3 {
          input.use(nil)
          requestID = UUID()
          [quietTimer, rotationTimer, finalTimer].forEach { $0?.invalidate() }
          task?.cancel()
          restartTimer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: false) { [weak self] _ in self?.openRequest() }
          return
        }
      }
      fail("recognition", "\(native.domain) (\(native.code)): \(native.localizedDescription)")
    }
  }

  private func finishRequest() {
    guard active, !finishing else { return }
    finishing = true
    quietTimer?.invalidate()
    rotationTimer?.invalidate()
    input.use(nil) // Capture stays running; buffer up to two seconds for renewal.
    request?.endAudio()
    task?.finish()
    finalTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: false) { [weak self] _ in
      guard let self, self.active else { return }
      self.shortFailures += 1
      if self.shortFailures >= 3 { self.fail("finalization", "Speech recognition repeatedly failed to finalize.") }
      else { self.openRequest() }
    }
  }

  private func fail(_ code: String, _ message: String) {
    emit("voiceError", ["error": code, "message": message])
    stop()
  }

  private func observeSession() {
    let center = NotificationCenter.default
    observers.append(center.addObserver(forName: AVAudioSession.interruptionNotification,
      object: AVAudioSession.sharedInstance(), queue: .main) { [weak self] note in
      guard let self, self.active,
        let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
        AVAudioSession.InterruptionType(rawValue: raw) == .began else { return }
      self.fail("interrupted", "Another audio session interrupted the microphone. Enable hands-free again when it finishes.")
    })
    observers.append(center.addObserver(forName: AVAudioSession.routeChangeNotification,
      object: AVAudioSession.sharedInstance(), queue: .main) { [weak self] note in
      guard let self, self.active,
        let raw = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt else { return }
      if AVAudioSession.RouteChangeReason(rawValue: raw) == .oldDeviceUnavailable {
        self.fail("route-changed", "The audio device disconnected. Reconnect it and enable hands-free again.")
      }
      // Going Home or changing the category is not by itself an interruption.
      // Do not use UIApplication.state to stop a valid background capture.
    })
    observers.append(center.addObserver(forName: .AVAudioEngineConfigurationChange,
      object: engine, queue: .main) { [weak self] _ in
      guard let self, self.active, let engine = self.engine, !engine.isRunning else { return }
      // Report a real stopped engine instead of leaving a false "listening" UI.
      self.fail("engine-stopped", "The audio route stopped microphone capture. Enable hands-free again.")
    })
    observers.append(center.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification,
      object: nil, queue: .main) { [weak self] _ in
      self?.fail("media-reset", "iOS restarted its audio service. Enable hands-free again.")
    })
  }
}
