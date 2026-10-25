import { StyleSheet } from "react-native";
export const colors = {
  background: "#141917",
  surface: "#202723",
  raised: "#2a332d",
  text: "#f3f0e7",
  muted: "#9aa79d",
  accent: "#f0b39a",
  line: "#354038",
  green: "#b6c9a6",
  danger: "#ec9e91",
};
export const shared = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  pad: { paddingHorizontal: 26 },
  title: {
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: -1,
    color: colors.text,
  },
  copy: { fontSize: 15, lineHeight: 24, color: colors.muted },
  eyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2.6,
    color: colors.muted,
  },
  row: { flexDirection: "row", alignItems: "center" },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 16,
    color: colors.text,
    fontSize: 16,
  },
  label: { color: colors.muted, fontSize: 12, marginTop: 22, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 20 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 18 },
});
