import { useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import {
  ExpoSpeechRecognitionModule as Recognition,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { parseCommand, VoiceCommand } from "../domain/model";
import { configurePlayback, useEcho } from "../context/EchoContext";

export function useVoiceCommands() {
  const echo = useEcho();
  const [listening, setListening] = useState(false),
    [starting, setStarting] = useState(false),
    [message, setMessage] = useState("Tap once. Say a command.");
  const active = useRef(false),
    pending = useRef<VoiceCommand | null>(null),
    wasPlaying = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useSpeechRecognitionEvent("start", () => {
    setStarting(false);
    setListening(true);
    setMessage("Listening…");
    void Haptics.selectionAsync();
  });
  useSpeechRecognitionEvent("result", (event) => {
    if (!active.current || !event.isFinal) return;
    pending.current = parseCommand(event.results[0]?.transcript || "");
    setMessage(
      pending.current
        ? `“${pending.current}”`
        : "Try play, pause, skip, go back, save, or follow.",
    );
    Recognition.stop();
  });
  useSpeechRecognitionEvent("error", (event) => {
    if (event.error !== "aborted")
      setMessage(
        event.error === "no-speech"
          ? "Nothing heard. Tap to try again."
          : "Voice is unavailable. Check your offline speech language in device settings.",
      );
  });
  useSpeechRecognitionEvent("end", () => {
    if (!active.current) return;
    active.current = false;
    setListening(false);
    setStarting(false);
    clearTimeout(timer.current);
    const cmd = pending.current;
    pending.current = null;
    void configurePlayback()
      .then(() => {
        if (cmd) {
          const response = echo.command(cmd);
          setMessage(response);
          if (cmd === "save" || cmd === "follow") {
            Speech.speak(response, {
              onDone: () => {
                if (wasPlaying.current) echo.play();
              },
              onError: () => {
                if (wasPlaying.current) echo.play();
              },
            });
          }
        } else if (wasPlaying.current && AppState.currentState === "active")
          echo.play();
      })
      .catch(() => setMessage("Tap play to resume your listening."));
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && active.current) {
        pending.current = null;
        wasPlaying.current = false;
        Recognition.abort();
      }
    });
    return () => {
      sub.remove();
      clearTimeout(timer.current);
      Recognition.abort();
      Speech.stop();
    };
  }, []);
  async function activate() {
    if (active.current) {
      pending.current = null;
      Recognition.abort();
      return;
    }
    if (starting) return;
    if (
      !Recognition.isRecognitionAvailable() ||
      !Recognition.supportsOnDeviceRecognition()
    ) {
      Alert.alert(
        "Offline voice unavailable",
        "This device needs an on-device English speech model. Echo will not send your voice to a cloud recognizer. Playback and headset controls still work.",
      );
      return;
    }
    setStarting(true);
    try {
      const permission = await Recognition.requestPermissionsAsync();
      if (!permission.granted) {
        setStarting(false);
        Alert.alert(
          "Microphone access needed",
          "Enable microphone and speech permissions in Settings to use voice commands.",
        );
        return;
      }
      await Speech.stop();
      wasPlaying.current = echo.playlist.playing;
      echo.playlist.pause();
      pending.current = null;
      active.current = true;
      Recognition.start({
        lang: "en-US",
        requiresOnDeviceRecognition: true,
        continuous: false,
        interimResults: false,
        maxAlternatives: 1,
        contextualStrings: [
          "play",
          "pause",
          "skip",
          "go back",
          "save",
          "follow",
        ],
        recordingOptions: { persist: false },
      });
      timer.current = setTimeout(() => {
        if (active.current) Recognition.stop();
      }, 10000);
    } catch {
      active.current = false;
      setStarting(false);
      setListening(false);
      setMessage("Could not start offline voice recognition.");
      await configurePlayback();
      if (wasPlaying.current) echo.play();
    }
  }
  return { listening, starting, message, activate };
}
