import { setAudioModeAsync } from "expo-audio";
import { AudioSessionOwner } from "./AudioSessionOwner";

const owner = new AudioSessionOwner((recording) => setAudioModeAsync({
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  allowsRecording: recording,
  allowsBackgroundRecording: recording,
  interruptionMode: "doNotMix",
}));
export const setVoiceAudioActive = (active: boolean) => owner.setVoiceActive(active);
export const configurePlayback = () => owner.configure();
