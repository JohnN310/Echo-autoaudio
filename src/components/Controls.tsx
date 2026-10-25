import React from "react";
import { Pressable, Text, View, StyleSheet, ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function IconButton({
  icon,
  label,
  onPress,
  size = 24,
  large = false,
  active = false,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  large?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.icon,
        large && s.large,
        active && s.active,
        { opacity: disabled ? 0.35 : pressed ? 0.65 : 1 },
      ]}
    >
      <Ionicons
        name={icon}
        size={size}
        color={large ? colors.background : active ? colors.accent : colors.text}
      />
    </Pressable>
  );
}
export function Action({
  title,
  onPress,
  icon,
  secondary = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        secondary && s.secondary,
        style,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={21}
          color={secondary ? colors.text : colors.background}
        />
      )}
      <Text style={[s.actionText, secondary && { color: colors.text }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function TopicPill({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        s.topic,
        selected && {
          backgroundColor: colors.accent,
          borderColor: colors.accent,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.background : colors.muted,
          fontSize: 14,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function ScreenHeader({
  title,
  onClose,
  right,
}: {
  title: string;
  onClose: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={s.header}>
      <Text style={s.headerText}>{title}</Text>
      {right}
      <IconButton icon="close" label="Close" onPress={onClose} />
    </View>
  );
}
const s = StyleSheet.create({
  icon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  large: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.accent,
  },
  active: { backgroundColor: colors.surface },
  action: {
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionText: { fontSize: 15, fontWeight: "600", color: colors.background },
  topic: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 30,
    paddingVertical: 13,
    paddingHorizontal: 19,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 26,
    paddingRight: 14,
    paddingVertical: 12,
  },
  headerText: { color: colors.text, fontSize: 19, fontWeight: "600", flex: 1 },
});
