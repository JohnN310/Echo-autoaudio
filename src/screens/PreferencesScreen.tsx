import React, { useState } from "react";
import { View, Text, ScrollView, Switch, TextInput } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEcho } from "../context/EchoContext";
import { TOPICS, Topic } from "../domain/model";
import { Action, ScreenHeader, TopicPill } from "../components/Controls";
import { colors, shared } from "../theme";
export function PreferencesScreen({
  onClose,
  onboarding = false,
}: {
  onClose: () => void;
  onboarding?: boolean;
}) {
  const echo = useEcho();
  const [interests, setInterests] = useState<Topic[]>(
      echo.library.preferences.interests,
    ),
    [autoplay, setAutoplay] = useState(echo.library.preferences.autoplay),
    [name, setName] = useState(echo.library.preferences.name);
  return (
    <View style={shared.screen}>
      {!onboarding && (
        <ScreenHeader title="Your listening space" onClose={onClose} />
      )}
      <ScrollView
        contentContainerStyle={[
          shared.pad,
          { paddingTop: onboarding ? 58 : 20, paddingBottom: 40 },
        ]}
      >
        <Ionicons name="headset-outline" size={39} color={colors.accent} />
        <Text
          style={[
            shared.title,
            { fontSize: onboarding ? 39 : 30, marginTop: 25, marginBottom: 15 },
          ]}
        >
          {onboarding
            ? "Less scrolling.\nMore living."
            : "Make it sound like you."}
        </Text>
        <Text style={shared.copy}>
          {onboarding
            ? "Stories, ideas, and little discoveries. One continuous stream. Start it before you go, then let Echo take it from here."
            : "Choose what you enjoy. We’ll keep the next good listen ready."}
        </Text>
        <Text style={shared.label}>WHAT DO YOU LOVE?</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
          {TOPICS.map((t) => (
            <TopicPill
              key={t}
              title={t}
              selected={interests.includes(t)}
              onPress={() =>
                setInterests((p) =>
                  p.includes(t) ? p.filter((x) => x !== t) : [...p, t],
                )
              }
            />
          ))}
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 30,
            paddingVertical: 20,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.line,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 15 }}>
              Keep the echoes coming
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
              Auto-next and play on opening
            </Text>
          </View>
          <Switch
            accessibilityLabel="Automatic playback"
            value={autoplay}
            onValueChange={setAutoplay}
            trackColor={{ false: colors.line, true: colors.accent }}
            thumbColor={colors.text}
          />
        </View>
        {!onboarding && (
          <>
            <Text style={shared.label}>YOUR CREATOR NAME</Text>
            <TextInput
              style={shared.input}
              value={name}
              onChangeText={setName}
              maxLength={30}
              accessibilityLabel="Creator name"
              placeholderTextColor={colors.muted}
            />
          </>
        )}
        <Action
          title={onboarding ? "Let’s listen" : "Save preferences"}
          icon="arrow-forward"
          style={{ marginTop: 28 }}
          disabled={!interests.length}
          onPress={() => {
            echo.updatePreferences({
              name: name.trim() || "Listener",
              interests,
              autoplay,
              onboarded: true,
            });
            onClose();
          }}
        />
        <Text
          style={{
            color: colors.muted,
            textAlign: "center",
            fontSize: 11,
            lineHeight: 19,
            marginTop: 20,
          }}
        >
          {onboarding
            ? "No microphone access until you choose voice control or recording."
            : "Preferences and recordings are stored on this device."}
        </Text>
      </ScrollView>
    </View>
  );
}
