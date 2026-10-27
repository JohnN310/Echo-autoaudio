import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import { queueSource } from "../domain/audioSource";
import {
  useAudioPlaylist,
  useAudioPlaylistStatus,
} from "expo-audio";
import {
  Clip,
  EMPTY_LIBRARY,
  Library,
  Preferences,
  rankClips,
  VoiceCommand,
} from "../domain/model";
import { DEMO_CLIPS } from "../data/clips";
import { configurePlayback } from "../services/audioSession";
export { configurePlayback } from "../services/audioSession";

function useEchoState() {
  const [library, setLibrary] = useState<Library>(EMPTY_LIBRARY),
    [ready, setReady] = useState(false),
    [queue, setQueue] = useState<Clip[]>([]),
    [notice, setNotice] = useState("");
  const playlist = useAudioPlaylist({
    sources: [],
    loop: "all",
    updateInterval: 300,
  });
  const status = useAudioPlaylistStatus(playlist);
  const current = queue[status.currentIndex] || queue[0];
  const allClips = useMemo(
    () => [...DEMO_CLIPS, ...library.own],
    [library.own],
  );
  const feed = useMemo(() => rankClips(allClips, library), [allClips, library]);
  const write = useRef(Promise.resolve());
  const initialized = useRef(false);
  const appliedPreferences = useRef<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const notify = (text: string) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 4000);
  };
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("echo.library.v1");
        if (stored && mounted) {
          const data = JSON.parse(stored);
          if (data.preferences && Array.isArray(data.own))
            setLibrary({
              ...EMPTY_LIBRARY,
              ...data,
              preferences: {
                ...EMPTY_LIBRARY.preferences,
                ...data.preferences,
              },
            });
        }
      } catch {
        Alert.alert(
          "Storage unavailable",
          "Your listening session can continue, but saved items may not persist.",
        );
      } finally {
        if (mounted) setReady(true);
      }
    })();
    configurePlayback().catch(() =>
      notify("Audio setup failed. Try starting playback again."),
    );
    return () => {
      mounted = false;
      clearTimeout(noticeTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    write.current = write.current
      .then(() =>
        AsyncStorage.setItem("echo.library.v1", JSON.stringify(library)),
      )
      .catch(() => notify("Could not save your library on this device."));
  }, [library, ready]);
  const start = (clip?: Clip, autoplay = true, items = feed) => {
    const choice = clip || items[0];
    if (!choice) {
      playlist.pause();
      playlist.clear();
      setQueue([]);
      notify("Choose some interests or add an echo to start listening.");
      return;
    }
    const available = items.length ? items : [choice];
    const at = available.findIndex((c) => c.id === choice.id);
    const ordered =
      at >= 0
        ? [...available.slice(at), ...available.slice(0, at)]
        : [choice, ...available];
    const nextQueue = library.preferences.autoplay ? ordered : [choice];
    try {
      const sources = nextQueue.map((c) =>
        queueSource(c.source, c.title, (id) => Asset.fromModule(id)),
      );
      playlist.pause();
      playlist.clear();
      sources.forEach((source) => playlist.add(source));
    } catch {
      notify("Could not load the audio files. Please try again.");
      return;
    }
    playlist.loop = library.preferences.autoplay ? "all" : "none";
    setQueue(nextQueue);
    if (autoplay)
      void configurePlayback()
        .then(() => {
          playlist.setActiveForLockScreen(true, {
            title: choice.title,
            artist: choice.creator,
            albumTitle: "Echo",
          });
          playlist.play();
        })
        .catch(() => notify("Unable to start audio. Please try again."));
  };
  useEffect(() => {
    if (ready && !initialized.current) {
      initialized.current = true;
      appliedPreferences.current = JSON.stringify(library.preferences);
      start(
        undefined,
        library.preferences.onboarded && library.preferences.autoplay,
      );
    }
  }, [ready]);
  useEffect(() => {
    const key = JSON.stringify(library.preferences);
    if (!ready || !initialized.current || key === appliedPreferences.current)
      return;
    const previous = appliedPreferences.current
      ? (JSON.parse(appliedPreferences.current) as Preferences)
      : null;
    appliedPreferences.current = key;
    start(
      previous?.onboarded ? current : undefined,
      status.playing || (!previous?.onboarded && library.preferences.autoplay),
    );
  }, [library.preferences, ready]);
  useEffect(() => {
    if (current)
      playlist.updateLockScreenMetadata({
        title: current.title,
        artist: current.creator,
        albumTitle: "Echo",
      });
  }, [current?.id]);
  const play = () => {
    if (!current) {
      start();
      return;
    }
    void configurePlayback()
      .then(async () => {
        playlist.setActiveForLockScreen(true, {
          title: current.title,
          artist: current.creator,
          albumTitle: "Echo",
        });
        if (status.duration > 0 && status.currentTime >= status.duration - 0.1)
          await playlist.seekTo(0);
        playlist.play();
      })
      .catch(() => notify("Unable to play this echo."));
  };
  const skip = (back = false) => {
    if (queue.length > 1) {
      void configurePlayback().then(() => {
        back ? playlist.previous() : playlist.next();
        const next = queue[playlist.currentIndex];
        if (next) playlist.setActiveForLockScreen(true, {
          title: next.title, artist: next.creator, albumTitle: "Echo",
        });
        playlist.play();
      }).catch(() => notify("Could not change tracks. Please try again."));
      return;
    }
    const at = feed.findIndex((c) => c.id === current?.id);
    start(feed[(at + (back ? -1 : 1) + feed.length) % feed.length]);
  };
  const toggleSave = (id = current?.id) => {
    if (!id) return;
    setLibrary((l) => ({
      ...l,
      saved: l.saved.includes(id)
        ? l.saved.filter((x) => x !== id)
        : [...l.saved, id],
    }));
  };
  const toggleFollow = (creator = current?.creator) => {
    if (!creator) return;
    setLibrary((l) => ({
      ...l,
      followed: l.followed.includes(creator)
        ? l.followed.filter((x) => x !== creator)
        : [...l.followed, creator],
    }));
  };
  const command = (cmd: VoiceCommand) => {
    if (cmd === "play") {
      play();
      return "Playing";
    }
    if (cmd === "pause") {
      playlist.pause();
      return "Paused";
    }
    if (cmd === "skip") {
      skip();
      return "Next echo";
    }
    if (cmd === "go back") {
      skip(true);
      return "Previous echo";
    }
    if (!current) return "Start listening first";
    if (cmd === "save") {
      setLibrary((l) => ({
        ...l,
        saved: [...new Set([...l.saved, current.id])],
      }));
      return "Echo saved";
    }
    setLibrary((l) => ({
      ...l,
      followed: [...new Set([...l.followed, current.creator])],
    }));
    return `Following ${current.creator}`;
  };
  const updatePreferences = (preferences: Preferences) =>
    setLibrary((l) => ({ ...l, preferences }));
  const addClip = (clip: Clip) =>
    setLibrary((l) => ({
      ...l,
      own: [...l.own, clip],
      saved: [...l.saved, clip.id],
    }));
  const hide = (clip: Clip) => {
    setLibrary((l) => ({ ...l, hidden: [...l.hidden, clip.id] }));
    start(
      feed.find((c) => c.id !== clip.id),
      status.playing,
      feed.filter((c) => c.id !== clip.id),
    );
  };
  return {
    library,
    ready,
    feed,
    allClips,
    queue,
    current,
    playlist,
    status,
    notice,
    notify,
    start,
    play,
    skip,
    toggleSave,
    toggleFollow,
    command,
    updatePreferences,
    addClip,
    hide,
  };
}
type EchoState = ReturnType<typeof useEchoState>;
const Context = createContext<EchoState | null>(null);
export function EchoProvider({ children }: { children: React.ReactNode }) {
  const state = useEchoState();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useEcho() {
  const value = useContext(Context);
  if (!value) throw new Error("EchoProvider missing");
  return value;
}
