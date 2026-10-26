import { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "Echo",
  slug: "echo-mobile",
  version: "1.0.0",
  scheme: "echo",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  platforms: ["ios", "android"],
  icon: "./assets/icon.png",
  extra: {
    eas: {
      projectId: "28b14876-7764-4cd7-ab08-2d6cb00a3d2f",
    },
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.echo.listening",
    infoPlist: {
      UIBackgroundModes: ["audio"],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.echo.listening",
    predictiveBackGestureEnabled: true,
  },
  plugins: [
    [
      "expo-audio",
      {
        microphonePermission:
          "Allow Echo to record an echo when you choose to record.",
        enableBackgroundPlayback: true,
        enableBackgroundRecording: false,
      },
    ],
    [
      "expo-speech-recognition",
      {
        microphonePermission:
          "Allow Echo to hear a voice command when you activate the microphone.",
        speechRecognitionPermission:
          "Allow Echo to recognize short playback commands on this device.",
      },
    ],
    "expo-document-picker",
    "expo-sharing",
    "expo-font",
    "expo-asset",
  ],
};
export default config;
