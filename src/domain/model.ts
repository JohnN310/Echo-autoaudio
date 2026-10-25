export const TOPICS = [
  "Stories",
  "Comedy",
  "Science",
  "Technology",
  "Mind & life",
] as const;
export type Topic = (typeof TOPICS)[number];
export type Clip = {
  id: string;
  title: string;
  creator: string;
  topic: Topic;
  duration: number;
  description: string;
  source: number | string;
  local?: boolean;
};
export type Preferences = {
  name: string;
  interests: Topic[];
  autoplay: boolean;
  onboarded: boolean;
};
export type Library = {
  preferences: Preferences;
  saved: string[];
  followed: string[];
  hidden: string[];
  own: Clip[];
};
export const EMPTY_LIBRARY: Library = {
  preferences: {
    name: "Listener",
    interests: ["Stories", "Science"],
    autoplay: true,
    onboarded: false,
  },
  saved: [],
  followed: [],
  hidden: [],
  own: [],
};
export type VoiceCommand =
  "play" | "pause" | "skip" | "go back" | "save" | "follow";
export function parseCommand(transcript: string): VoiceCommand | null {
  // Full-phrase matching: never treat a mention of a command in a sentence as an action.
  const text = transcript
    .toLowerCase()
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^hey echo\s+/, "");
  return (
    (["play", "pause", "skip", "go back", "save", "follow"] as const).find(
      (c) => c === text,
    ) ?? null
  );
}
export function rankClips(clips: Clip[], library: Library): Clip[] {
  const score = (c: Clip) =>
    (library.preferences.interests.includes(c.topic) ? 3 : 0) +
    (library.followed.includes(c.creator) ? 4 : 0) +
    (library.saved.includes(c.id) ? 1 : 0);
  // Completion alone is deliberately not a positive recommendation signal.
  return clips
    .filter((c) => !library.hidden.includes(c.id))
    .sort((a, b) => score(b) - score(a));
}
export function validDuration(seconds: number) {
  return Number.isFinite(seconds) && seconds >= 1 && seconds <= 180;
}
export function formatTime(seconds: number) {
  const n = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
