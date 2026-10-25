import React from "react";
import { ScrollView, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ScreenHeader } from "../components/Controls";
import { colors, shared } from "../theme";
export function VoiceInfoScreen({ onClose }: { onClose: () => void }) {
  return (
    <View style={shared.screen}>
      <ScreenHeader title="Your voice, in control" onClose={onClose} />
      <ScrollView
        contentContainerStyle={[
          shared.pad,
          { paddingTop: 22, paddingBottom: 40 },
        ]}
      >
        <Ionicons name="mic-outline" size={38} color={colors.accent} />
        <Text style={[shared.title, { marginTop: 24 }]}>
          Less reaching.\nMore listening.
        </Text>
        <Text style={[shared.copy, { marginTop: 18, marginBottom: 24 }]}>
          Tap the microphone, then say one command. Echo pauses your audio so it
          can hear you clearly.
        </Text>
        {[
          ["Play", "Start listening"],
          ["Pause", "Take a little break"],
          ["Skip", "Hear the next echo"],
          ["Go back", "Return to the previous echo"],
          ["Save", "Keep this one for later"],
          ["Follow", "Hear more from this creator"],
        ].map(([command, description]) => (
          <View
            key={command}
            style={{
              flexDirection: "row",
              paddingVertical: 18,
              borderBottomWidth: 1,
              borderColor: colors.line,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 17, color: colors.accent, width: 100 }}>
              “{command}”
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, flex: 1 }}>
              {description}
            </Text>
          </View>
        ))}
        <Text style={[shared.copy, { marginTop: 26, fontSize: 13 }]}>
          Voice commands run on-device when your phone supports offline English
          recognition. Echo does not save transcripts or upload microphone
          audio.
        </Text>
        <Text style={[shared.copy, { marginTop: 18, fontSize: 13 }]}>
          “Hey Echo” wake-word activation while locked is not available yet.
          Start your queue before driving; automatic playback and supported
          headset or lock-screen media controls let your phone stay put.
        </Text>
      </ScrollView>
    </View>
  );
}
