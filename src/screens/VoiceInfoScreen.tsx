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
          Enable hands-free once, then say “Hey Echo, skip” or say “Hey Echo”
          and follow with a command within eight seconds. Audio keeps playing
          while Echo waits for the wake phrase, and pauses when you address it.
        </Text>
        {[
          ["Play", "Start listening"],
          ["Pause", "Take a little break"],
          ["Skip", "Hear the next echo"],
          ["Go back", "Return to the previous echo"],
          ["Save", "Keep this one for later"],
          ["Follow", "Hear more from this creator"],
          ["Play science", "Choose a topic from the available audio"],
          ["Play my saved echoes", "Listen to your saved collection"],
          ["Cancel", "Drop this command and return to waiting"],
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
          Hands-free uses on-device English speech recognition. The microphone
          stays active until you turn it off; this uses more battery than normal
          playback. Transcripts are processed temporarily and are not saved or
          uploaded. Android requires version 13 or later, an installed English
          (US) model, and headphones. iOS uses voice processing to reduce playback
          feedback; headphones give the best results.
        </Text>
        <Text style={[shared.copy, { marginTop: 18, fontSize: 13 }]}>
          Start hands-free while Echo is open. The session is designed to continue
          when you switch apps or lock the phone. Tap the microphone card again
          to cancel and turn it off, or use the Android notification’s stop action.
          Force-closing Echo ends the session. Calls, microphone conflicts, and
          system restrictions can also stop it; reopen Echo to enable it again.
          Background behavior needs testing on your physical device.
        </Text>
      </ScrollView>
    </View>
  );
}
