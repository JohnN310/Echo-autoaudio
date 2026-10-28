import ExpoModulesCore
import Speech

public class EchoVoiceServiceModule: Module {
  private lazy var microphone = EchoMicrophone { [weak self] name, body in
    self?.sendEvent(name, body)
  }

  public func definition() -> ModuleDefinition {
    Name("EchoVoiceService")
    Events("voiceStart", "voiceResult", "voiceError", "voiceEnd")
    Constant("continuousCaptureVersion") { 1 }

    AsyncFunction("startRecognition") { () throws -> Void in
      try self.microphone.start()
    }.runOnQueue(.main)

    AsyncFunction("stopRecognition") { () -> Void in
      self.microphone.stop()
    }.runOnQueue(.main)

    AsyncFunction("getRecognitionState") { () -> String in
      self.microphone.state
    }.runOnQueue(.main)

    OnDestroy {
      DispatchQueue.main.async {
        self.microphone.stop(emitEnd: false)
      }
    }

    // Check the actual recognition locale, not the device's default locale.
    // Never start an English request that could fall back to network recognition.
    Function("supportsEnglishRecognition") { () -> Bool in
      guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")) else {
        return false
      }
      return recognizer.isAvailable && recognizer.supportsOnDeviceRecognition
    }
  }
}
