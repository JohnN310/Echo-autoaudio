import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import { configurePlayback, useEcho } from "../context/EchoContext";
import { TOPICS, Topic, formatTime, validDuration } from "../domain/model";
import { Action, ScreenHeader, TopicPill } from "../components/Controls";
import { colors, shared } from "../theme";
export function CreateScreen({ onClose }: { onClose: () => void }) {
  const echo = useEcho();
  const [uri, setUri] = useState<string | null>(null),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [topic, setTopic] = useState<Topic>("Stories"),
    [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const preview = useAudioPlayer(uri),
    previewStatus = useAudioPlayerStatus(preview);
  const recorder = useAudioRecorder(
    { ...RecordingPresets.HIGH_QUALITY, directory: "cache" },
    (state) => {
      if (state.hasError)
        Alert.alert(
          "Recording interrupted",
          state.error || "Please try again.",
        );
      if (state.isFinished && state.url && mounted.current) {
        setUri(state.url);
        void configurePlayback();
      }
    },
  );
  const recording = useAudioRecorderState(recorder, 200);
  useEffect(() => {
    echo.playlist.pause();
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && recorder.isRecording)
        void recorder.stop().catch(() => {});
    });
    return () => {
      mounted.current = false;
      sub.remove();
      if (recorder.isRecording) void recorder.stop().catch(() => {});
      void configurePlayback();
    };
  }, []);
  async function record() {
    setBusy(true);
    try {
      if (recording.isRecording) {
        await recorder.stop();
        if (recorder.uri) setUri(recorder.uri);
        await configurePlayback();
        return;
      }
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone access needed",
          "Allow microphone access to record, or choose an existing audio file.",
        );
        return;
      }
      preview.pause();
      setUri(null);
      await setAudioModeAsync({
        allowsRecording: true,
        shouldPlayInBackground: false,
        playsInSilentMode: true,
        interruptionMode: "doNotMix",
      });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: 180 });
    } catch {
      Alert.alert(
        "Could not record",
        "Please check microphone permissions and try again.",
      );
      await configurePlayback();
    } finally {
      setBusy(false);
    }
  }
  async function upload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if ((file.size || 0) > 20 * 1024 * 1024) {
        Alert.alert(
          "File too large",
          "Choose an audio file smaller than 20 MB.",
        );
        return;
      }
      preview.pause();
      setUri(file.uri);
    } catch {
      Alert.alert("Upload unavailable", "Please choose another audio file.");
    }
  }
  async function publish() {
    if (!uri || !validDuration(previewStatus.duration) || !title.trim()) {
      Alert.alert(
        "A little more to add",
        "Add a title and audio between 1 second and 3 minutes.",
      );
      return;
    }
    setBusy(true);
    try {
      preview.pause();
      const directory = new Directory(Paths.document, "echoes");
      directory.create({ idempotent: true, intermediates: true });
      const id = `echo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const extension = uri.split(".").pop()?.split("?")[0] || "m4a";
      const file = new File(directory, `${id}.${extension}`);
      new File(uri).copy(file);
      echo.addClip({
        id,
        title: title.trim(),
        description: description.trim(),
        topic,
        creator: echo.library.preferences.name,
        duration: previewStatus.duration,
        source: file.uri,
        local: true,
      });
      echo.notify("Your echo is saved to your library.");
      onClose();
    } catch {
      Alert.alert(
        "Could not save",
        "Check that your device has enough free space and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={shared.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader
        title="Create an echo"
        onClose={() => {
          if (recording.isRecording) {
            Alert.alert(
              "Recording in progress",
              "Stop your recording before leaving.",
            );
            return;
          }
          onClose();
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          shared.pad,
          { paddingTop: 20, paddingBottom: 40 },
        ]}
      >
        <Text style={shared.title}>Something worth hearing.</Text>
        <Text style={[shared.copy, { marginTop: 12, marginBottom: 27 }]}>
          Your voice. One story. Up to three minutes.
        </Text>
        <View style={[shared.card, { gap: 16 }]}>
          <Text
            style={{
              fontSize: 36,
              color: colors.text,
              textAlign: "center",
              fontVariant: ["tabular-nums"],
            }}
          >
            {recording.isRecording
              ? formatTime(recording.durationMillis / 1000)
              : uri
                ? formatTime(previewStatus.duration)
                : "0:00"}
          </Text>
          <Action
            icon={recording.isRecording ? "stop" : "mic-outline"}
            title={
              recording.isRecording ? "Finish recording" : "Record an echo"
            }
            onPress={() => void record()}
            disabled={busy}
          />
          <Action
            title="Choose an audio file"
            icon="cloud-upload-outline"
            secondary
            onPress={() => void upload()}
            disabled={busy || recording.isRecording}
          />
          {uri && (
            <>
              <Text
                style={{
                  color: validDuration(previewStatus.duration)
                    ? colors.muted
                    : colors.danger,
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                {previewStatus.isLoaded
                  ? validDuration(previewStatus.duration)
                    ? "Your audio is ready. Give it a listen."
                    : "Please choose audio between 1 second and 3 minutes."
                  : "Loading audio…"}
              </Text>
              <Action
                title={
                  previewStatus.playing
                    ? "Pause preview"
                    : "Listen before posting"
                }
                secondary
                icon={previewStatus.playing ? "pause" : "play"}
                disabled={!previewStatus.isLoaded}
                onPress={() => {
                  if (previewStatus.playing) preview.pause();
                  else {
                    if (
                      previewStatus.currentTime >=
                      previewStatus.duration - 0.1
                    )
                      void preview.seekTo(0);
                    preview.play();
                  }
                }}
              />
            </>
          )}
        </View>
        <Text style={shared.label}>TITLE</Text>
        <TextInput
          style={shared.input}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          placeholder="Give your echo a name"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Echo title"
        />
        <Text style={shared.label}>TOPIC</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TOPICS.map((t) => (
            <TopicPill
              key={t}
              title={t}
              selected={topic === t}
              onPress={() => setTopic(t)}
            />
          ))}
        </View>
        <Text style={shared.label}>A LITTLE CONTEXT · OPTIONAL</Text>
        <TextInput
          style={[shared.input, { minHeight: 90, textAlignVertical: "top" }]}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={500}
          placeholder="What's the story?"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Echo description"
        />
        <Action
          title="Add to my library"
          style={{ marginTop: 26 }}
          onPress={() => void publish()}
          disabled={
            busy ||
            recording.isRecording ||
            !uri ||
            !validDuration(previewStatus.duration) ||
            !title.trim()
          }
        />
        <Text
          style={[
            shared.copy,
            {
              fontSize: 11,
              lineHeight: 18,
              marginTop: 18,
              textAlign: "center",
            },
          ]}
        >
          Recordings stay on this device for now. Community publishing will be
          available when the backend is connected. Only upload audio you have
          permission to share.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
