import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Alert,
  Share,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Sharing from "expo-sharing";
import { useEcho } from "../context/EchoContext";
import { Clip, formatTime } from "../domain/model";
import { IconButton, ScreenHeader, TopicPill } from "../components/Controls";
import { colors, shared } from "../theme";
export function LibraryScreen({ onClose }: { onClose: () => void }) {
  const echo = useEcho();
  const [filter, setFilter] = useState("For you"),
    [search, setSearch] = useState("");
  const list = echo.feed.filter(
    (c) =>
      (filter === "Saved"
        ? echo.library.saved.includes(c.id)
        : filter === "Following"
          ? echo.library.followed.includes(c.creator)
          : filter === "Your echoes"
            ? c.local
            : true) &&
      `${c.title} ${c.creator} ${c.topic}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function more(c: Clip) {
    Alert.alert(
      c.creator,
      c.description,
      [
        {
          text: echo.library.followed.includes(c.creator)
            ? "Unfollow"
            : "Follow creator",
          onPress: () => echo.toggleFollow(c.creator),
        },
        {
          text: "Share",
          onPress: () => {
            void (
              c.local && typeof c.source === "string"
                ? Sharing.shareAsync(c.source)
                : Share.share({
                    message: `Listen to “${c.title}” by ${c.creator} on Echo.\necho://clip/${c.id}`,
                  })
            ).catch(() => echo.notify("Could not share this echo."));
          },
        },
        {
          text: "Hide / report",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Hide this echo?",
              "This prototype hides clips locally. Reports are not sent to a moderation team yet.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Hide clip", onPress: () => echo.hide(c) },
              ],
            ),
        },
        ...(Platform.OS === "ios"
          ? [{ text: "Cancel", style: "cancel" as const }]
          : []),
      ],
      { cancelable: true },
    );
  }
  return (
    <View style={shared.screen}>
      <ScreenHeader title="Your library" onClose={onClose} />
      <View style={[shared.pad, { paddingTop: 12, paddingBottom: 20 }]}>
        <Text style={[shared.copy, { marginBottom: 19 }]}>
          Pick a starting point. We’ll handle the rest.
        </Text>
        <TextInput
          accessibilityLabel="Search your library"
          value={search}
          onChangeText={setSearch}
          placeholder="A story, a topic, a voice…"
          placeholderTextColor={colors.muted}
          style={shared.input}
        />
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 18,
          }}
        >
          {["For you", "Saved", "Following", "Your echoes"].map((f) => (
            <TopicPill
              key={f}
              title={f}
              selected={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={shared.card}>
            <Text
              style={{ color: colors.text, fontSize: 19, marginBottom: 10 }}
            >
              Room for a good listen.
            </Text>
            <Text style={shared.copy}>
              {search
                ? "Try a different search."
                : filter === "Saved"
                  ? "Save a clip with your voice or its bookmark."
                  : filter === "Following"
                    ? "Follow a voice you love to find their echoes here."
                    : "Your recordings will appear here."}
            </Text>
          </View>
        }
        renderItem={({ item: c }) => (
          <View
            style={{
              borderBottomWidth: 1,
              borderColor: colors.line,
              paddingVertical: 20,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Play ${c.title}`}
              onPress={() => {
                echo.start(c);
                onClose();
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 15 }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="play" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 9,
                    letterSpacing: 1.3,
                    color: colors.muted,
                    marginBottom: 8,
                  }}
                >
                  {c.topic.toUpperCase()} · {formatTime(c.duration)}
                </Text>
                <Text
                  style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}
                >
                  {c.title}
                </Text>
                <Text
                  style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}
                >
                  {c.creator}
                  {c.local ? "" : " · Demo"}
                </Text>
              </View>
            </Pressable>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 4,
              }}
            >
              <IconButton
                icon={
                  echo.library.saved.includes(c.id)
                    ? "bookmark"
                    : "bookmark-outline"
                }
                label={
                  echo.library.saved.includes(c.id)
                    ? "Unsave echo"
                    : "Save echo"
                }
                size={19}
                active={echo.library.saved.includes(c.id)}
                onPress={() => echo.toggleSave(c.id)}
              />
              <IconButton
                icon="ellipsis-horizontal"
                label={`Options for ${c.title}`}
                size={20}
                onPress={() => more(c)}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}
