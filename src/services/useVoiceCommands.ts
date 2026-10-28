import { useEffect, useRef, useState } from "react";
import { AppState, PermissionsAndroid, Platform } from "react-native";
import { NativeModule, requireOptionalNativeModule } from "expo";
import {
  ExpoSpeechRecognitionModule as Recognition,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useEcho } from "../context/EchoContext";
import { requestedClips } from "../domain/voiceRequest";
import { VoiceSession, VoiceState } from "./VoiceSession";
import { configurePlayback, setVoiceAudioActive } from "./audioSession";

declare class BackgroundVoiceModule extends NativeModule<{
  stopped: () => void;
  voiceStart: () => void;
  voiceEnd: () => void;
  voiceResult: (event: { transcript: string; isFinal: boolean; utteranceId: number }) => void;
  voiceError: (event: { error: string; message: string }) => void;
}> {
  continuousCaptureVersion?: number;
  startRecognition(): Promise<void>;
  stopRecognition(): Promise<void>;
  getRecognitionState(): Promise<string>;
  start(): Promise<void>;
  stop(): void;
  hasHeadphones(): boolean;
  supportsEnglishRecognition(): boolean;
}
const background = requireOptionalNativeModule<BackgroundVoiceModule>("EchoVoiceService");
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function waitForIdle() {
  for (let attempt = 0; attempt < 30; attempt++) {
    const state = Platform.OS === "ios"
      ? await background?.getRecognitionState?.() ?? "inactive"
      : await Recognition.getStateAsync();
    if (state === "inactive") return;
    await delay(100);
  }
  if (Platform.OS === "ios") await background?.stopRecognition?.();
  else Recognition.abort();
  throw new Error("Microphone is still stopping. Please try again.");
}

export function useVoiceCommands() {
  const echo = useEcho();
  const echoRef = useRef(echo);
  useEffect(() => { echoRef.current = echo; }, [echo]);
  const [state, setState] = useState<VoiceState>({
    phase: "off", message: "Enable hands-free. Say “Hey Echo”.",
  });
  // The initializer only stores callbacks; echoRef is read later by native events.
  // eslint-disable-next-line react-hooks/refs
  const [session] = useState(() => new VoiceSession({
    continuousCapture: Platform.OS === "ios",
    update: setState,
    authorize: async (isCurrent) => {
      if (AppState.currentState !== "active") throw new Error("Open Echo to enable hands-free.");
      if (!background) throw new Error("Install a new native Echo build to use hands-free.");
      if (Platform.OS === "ios" && background.continuousCaptureVersion !== 1)
        throw new Error("Rebuild Echo in Xcode to install continuous background microphone support.");
      if (Platform.OS === "android" && Number(Platform.Version) < 33)
        throw new Error("Hands-free needs Android 13 or later.");
      const permission = Platform.OS === "ios"
        ? await Recognition.requestMicrophonePermissionsAsync()
        : await Recognition.requestPermissionsAsync();
      if (!isCurrent()) return;
      if (!permission.granted)
        throw new Error("Allow microphone access in Settings, then try again.");
      const supported = Platform.OS === "ios" ? background.supportsEnglishRecognition()
        : Recognition.isRecognitionAvailable() && Recognition.supportsOnDeviceRecognition();
      if (!supported)
        throw new Error("Offline voice unavailable. Use a supported physical phone with English speech recognition.");
      if (Platform.OS === "android") {
        const { installedLocales } = await Recognition.getSupportedLocales({});
        if (!isCurrent()) return;
        if (!installedLocales.some((locale) => locale.toLowerCase().replace("_", "-") === "en-us"))
          throw new Error("Download the English (US) offline speech model in your device speech settings first.");
        if (!background?.hasHeadphones())
          throw new Error("Connect headphones for Android hands-free to reduce playback feedback.");
        const notification = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        if (!isCurrent()) return;
        if (notification !== PermissionsAndroid.RESULTS.GRANTED)
          throw new Error("Allow notifications so hands-free has a visible microphone stop control.");
      }
    },
    prepare: async () => {
      if (AppState.currentState !== "active") throw new Error("Open Echo to enable hands-free.");
      if (Platform.OS === "android") await background!.start();
      setVoiceAudioActive(true);
      await configurePlayback();
    },
    release: async () => {
      if (Platform.OS === "android") background?.stop();
      setVoiceAudioActive(false);
      await configurePlayback();
    },
    start: () => {
      if (Platform.OS === "ios") {
        return background!.startRecognition().catch((error: unknown) => {
          console.warn("[Echo voice] Native microphone start failed", error);
          throw error;
        });
      }
      Recognition.start({
      lang: "en-US",
      requiresOnDeviceRecognition: true,
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      contextualStrings: ["Hey Echo", "play", "pause", "skip", "go back", "save", "follow", "cancel", "play my saved echoes"],
      recordingOptions: { persist: false },
      iosVoiceProcessingEnabled: true,
      iosCategory: {
        category: "playAndRecord", mode: "voiceChat",
        categoryOptions: ["defaultToSpeaker", "allowBluetooth"],
      },
      });
    },
    finish: () => Recognition.stop(),
    abort: () => {
      if (Platform.OS === "ios") {
        void background?.stopRecognition?.().catch((error: unknown) => {
          console.warn("[Echo voice] Native microphone stop failed", error);
        });
      } else Recognition.abort();
    },
    idle: waitForIdle,
    pause: () => {
      const playing = echoRef.current.playlist.playing;
      echoRef.current.playlist.pause();
      return playing;
    },
    resume: () => echoRef.current.play(),
    execute: (request) => {
      const current = echoRef.current;
      const response = (message: string, resume: boolean) => {
        current.notify(message);
        return { message, resume };
      };
      if (request.kind === "control") {
        if (request.command === "cancel") return response("Command canceled", true);
        return response(current.command(request.command),
          request.command === "save" || request.command === "follow");
      }
      const matches = requestedClips(request.query, current.allClips, current.library);
      if (!matches.length) return response("No matching audio in your library", true);
      current.start(matches[0], true, matches);
      return response(`Playing ${matches[0].title}`, false);
    },
  }));

  useSpeechRecognitionEvent("start", () => { if (Platform.OS !== "ios") session.onStart(); });
  useSpeechRecognitionEvent("result", (event) => {
    if (Platform.OS !== "ios") session.onResult(event.results[0]?.transcript || "", event.isFinal);
  });
  useSpeechRecognitionEvent("error", (event) => {
    if (Platform.OS !== "ios") session.onError(event.error);
  });
  useSpeechRecognitionEvent("end", () => { if (Platform.OS !== "ios") session.onEnd(); });

  useEffect(() => {
    let lastFinal = -1;
    const nativeSubscriptions = Platform.OS === "ios" && background?.continuousCaptureVersion === 1 ? [
      background.addListener("voiceStart", () => { session.onStart(); }),
      background.addListener("voiceResult", (event) => {
        if (event.utteranceId <= lastFinal) return;
        if (event.isFinal) lastFinal = event.utteranceId;
        session.onResult(event.transcript, event.isFinal);
      }),
      background.addListener("voiceError", (event) => {
        console.warn(`[Echo voice] ${event.error}: ${event.message}`);
        void session.disable(`Microphone stopped (${event.error}). ${event.message}`);
      }),
      background.addListener("voiceEnd", () => session.onEnd()),
    ] : [];
    const subscription = Platform.OS === "android" ? background?.addListener("stopped", () => {
      void session.disable("Hands-free stopped from the notification.");
    }) : undefined;
    const routeCheck = Platform.OS === "android" ? setInterval(() => {
      if (session.state.phase !== "off" && !background?.hasHeadphones())
        void session.disable("Headphones disconnected. Hands-free is off.");
    }, 1000) : undefined;
    return () => {
      nativeSubscriptions.forEach((subscription) => subscription.remove());
      subscription?.remove();
      clearInterval(routeCheck);
      void session.disable();
    };
  }, [session]);

  return {
    ...state,
    enabled: state.phase !== "off",
    listening: state.phase === "command",
    starting: state.phase === "starting",
    activate: () => state.phase === "off" ? session.enable() : session.disable(),
    cancel: () => session.disable(),
  };
}
