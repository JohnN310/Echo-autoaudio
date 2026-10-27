import ExpoModulesCore
import Speech

public class EchoVoiceServiceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("EchoVoiceService")

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
