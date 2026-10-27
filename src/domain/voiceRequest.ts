import type { Clip, Library, VoiceCommand } from "./model";

export type VoiceRequest =
  | { kind: "control"; command: VoiceCommand | "cancel" }
  | { kind: "content"; query: string };

export function normalizeSpeech(text: string) {
  return text.toLowerCase().replace(/[.,!?;:]/g, "").replace(/\s+/g, " ").trim();
}

export function wakeCommand(text: string): string | null {
  const normalized = normalizeSpeech(text);
  if (normalized === "hey echo") return "";
  return normalized.startsWith("hey echo ") ? normalized.slice(9) : null;
}

export function parseVoiceRequest(text: string): VoiceRequest | null {
  const value = normalizeSpeech(text);
  const controls = ["play", "pause", "skip", "go back", "save", "follow", "cancel"] as const;
  const command = controls.find((c) => c === value);
  if (command) return { kind: "control", command };
  // Only an explicit play request searches the local catalog.
  if (value.startsWith("play ") && value.length <= 160)
    return { kind: "content", query: value.slice(5) };
  return null;
}

export function requestedClips(query: string, clips: Clip[], library: Library): Clip[] {
  const available = clips.filter((clip) => !library.hidden.includes(clip.id));
  const value = normalizeSpeech(query);
  if (["saved", "saved echoes", "my saved echoes"].includes(value))
    return available.filter((clip) => library.saved.includes(clip.id));
  if (["my echoes", "my recordings"].includes(value))
    return available.filter((clip) => clip.local);
  if (["my feed", "my queue", "something"].includes(value)) return available;
  return available.filter((clip) => {
    const topic = normalizeSpeech(clip.topic).replace("&", "and");
    return [topic, `${topic} stories`, `${topic} echoes`, normalizeSpeech(clip.title),
      normalizeSpeech(clip.creator), `by ${normalizeSpeech(clip.creator)}`].includes(value);
  });
}
