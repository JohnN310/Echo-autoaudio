import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Slider from "@react-native-community/slider";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEcho } from "../context/EchoContext";
import { useVoiceCommands } from "../services/useVoiceCommands";
import { ListeningOrb } from "../components/ListeningOrb";
import { IconButton } from "../components/Controls";
import { colors, shared } from "../theme";
import { formatTime } from "../domain/model";

export function ListenScreen({
  onLibrary,
  onCreate,
  onSettings,
  onVoiceInfo,
}: {
  onLibrary: () => void;
  onCreate: () => void;
  onSettings: () => void;
  onVoiceInfo: () => void;
}) {
  const echo = useEcho(),
    voice = useVoiceCommands();
  const dimensions = useWindowDimensions();
  const clip = echo.current;
  const busy = voice.listening || voice.starting;
  return (
    <View style={shared.screen}>
      <View style={s.header}>
        <Text style={s.logo}>
          echo<Text style={{ color: colors.accent }}>·</Text>
        </Text>
        <IconButton
          icon="options-outline"
          label="Listening preferences"
          onPress={onSettings}
          disabled={busy}
        />
      </View>
      <View style={s.body}>
        <View style={s.status}>
          <View
            style={[
              s.dot,
              {
                backgroundColor: echo.status.playing
                  ? colors.green
                  : colors.muted,
              },
            ]}
          />
          <Text style={s.statusText}>
            {voice.listening
              ? "LISTENING TO YOU"
              : echo.status.playing
                ? "JUST LISTEN"
                : "YOUR NEXT GOOD LISTEN"}
          </Text>
        </View>
        {dimensions.height > 740 && dimensions.fontScale < 1.3 && (
          <View style={s.orb}>
            <ListeningOrb
              playing={echo.status.playing}
              listening={voice.listening}
            />
          </View>
        )}
        <Text style={s.topic}>
          {clip?.topic.toUpperCase() || "A LITTLE CURIOSITY"}
        </Text>
        <Text style={s.title} numberOfLines={3}>
          {clip?.title || "A world worth listening to."}
        </Text>
        <Text style={s.creator}>
          {clip?.creator || "Press play. We’ll take it from here."}
        </Text>
        <View style={s.progress}>
          <Slider
            accessibilityLabel="Listening progress"
            minimumValue={0}
            maximumValue={echo.status.duration || clip?.duration || 1}
            value={echo.status.currentTime || 0}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.accent}
            onSlidingComplete={(n) =>
              void echo.playlist
                .seekTo(n)
                .catch(() => echo.notify("Could not seek in this clip."))
            }
          />
          <View style={s.times}>
            <Text style={s.time}>{formatTime(echo.status.currentTime)}</Text>
            <Text style={s.time}>
              {formatTime(echo.status.duration || clip?.duration || 0)}
            </Text>
          </View>
        </View>
        <View style={s.playback}>
          <IconButton
            icon="play-skip-back"
            label="Go back"
            size={27}
            onPress={() => echo.skip(true)}
            disabled={busy}
          />
          <IconButton
            icon={echo.status.playing ? "pause" : "play"}
            label={echo.status.playing ? "Pause" : "Play"}
            size={35}
            large
            onPress={() =>
              echo.status.playing ? echo.playlist.pause() : echo.play()
            }
            disabled={busy}
          />
          <IconButton
            icon="play-skip-forward"
            label="Skip"
            size={27}
            onPress={() => echo.skip()}
            disabled={busy}
          />
        </View>
        <View style={s.auto}>
          <Ionicons name="infinite-outline" color={colors.muted} size={16} />
          <Text style={s.autoText}>
            {echo.library.preferences.autoplay
              ? "The next echo plays automatically."
              : "One echo at a time."}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            busy ? "Cancel voice command" : "Activate on-device voice command"
          }
          onPress={() => void voice.activate()}
          style={[s.voice, busy && { borderColor: colors.accent }]}
        >
          <View style={s.mic}>
            <Ionicons
              name={busy ? "mic" : "mic-outline"}
              size={23}
              color={colors.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.voiceTitle}>
              {voice.starting
                ? "Getting ready…"
                : voice.listening
                  ? "Say a command"
                  : "Your voice. Your controls."}
            </Text>
            <Text style={s.voiceCaption}>{voice.message}</Text>
          </View>
          {busy && <Ionicons name="close" color={colors.muted} size={20} />}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onVoiceInfo}
          style={s.commandHint}
        >
          <Text style={s.hint}>
            Play · Pause · Skip · Go back · Save · Follow
          </Text>
        </Pressable>
      </View>
      <View style={s.bottom}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onLibrary}
          style={s.bottomButton}
        >
          <Ionicons name="albums-outline" size={19} color={colors.muted} />
          <Text style={s.bottomText}>Your library</Text>
        </Pressable>
        <Text style={{ color: colors.line }}>│</Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onCreate}
          style={s.bottomButton}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.muted} />
          <Text style={s.bottomText}>Create an echo</Text>
        </Pressable>
      </View>
      {echo.notice ? (
        <View accessibilityLiveRegion="polite" style={s.toast}>
          <Text style={{ color: colors.background, textAlign: "center" }}>
            {echo.notice}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontSize: 31,
    color: colors.text,
    fontWeight: "700",
    letterSpacing: -1.8,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 28,
    paddingBottom: 4,
  },
  status: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 5, height: 5, borderRadius: 4 },
  statusText: {
    fontSize: 9,
    letterSpacing: 2.7,
    color: colors.muted,
    fontWeight: "600",
  },
  orb: { marginTop: 0, marginBottom: 0 },
  topic: {
    fontSize: 9,
    letterSpacing: 2.3,
    color: colors.accent,
    marginBottom: 0,
  },
  title: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "500",
    letterSpacing: -0.7,
    color: colors.text,
    textAlign: "center",
    maxWidth: 340,
  },
  creator: { fontSize: 13, color: colors.muted, marginTop: 0 },
  progress: { width: "100%", maxWidth: 370, marginTop: 0 },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 13,
  },
  time: { fontSize: 10, color: colors.muted, fontVariant: ["tabular-nums"] },
  playback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 36,
    marginTop: 0,
  },
  auto: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 0 },
  autoText: { color: colors.muted, fontSize: 10 },
  voice: {
    marginTop: 0,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    width: "100%",
    maxWidth: 390,
  },
  mic: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: "#f0b39a12",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceTitle: { color: colors.text, fontSize: 13, fontWeight: "600" },
  voiceCaption: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  commandHint: { minHeight: 30, justifyContent: "center" },
  hint: { color: colors.muted, fontSize: 10 },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 8,
    paddingTop: 5,
  },
  bottomButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
  },
  bottomText: { fontSize: 11, color: colors.muted },
  toast: {
    position: "absolute",
    bottom: 66,
    left: 24,
    right: 24,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.accent,
  },
});
