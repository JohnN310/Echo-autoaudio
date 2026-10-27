import { setAudioModeAsync } from "expo-audio";

let voiceActive = false;
export function setVoiceAudioActive(active: boolean) { voiceActive = active; }

export const configurePlayback = () => setAudioModeAsync({
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  allowsRecording: voiceActive,
  allowsBackgroundRecording: voiceActive,
  interruptionMode: "doNotMix",
});
