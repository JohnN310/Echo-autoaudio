import { Clip } from "../domain/model";
export const DEMO_CLIPS: Clip[] = [
  {
    id: "shower",
    title: "Your best ideas happen when you stop looking.",
    creator: "The Everyday Mind",
    topic: "Mind & life",
    duration: 60.37,
    description:
      "Why a little space can make room for a new perspective. Original demo narration.",
    source: require("../../assets/audio/shower.wav"),
  },
  {
    id: "wrong-train",
    title: "The wrong train. The right kind of day.",
    creator: "Somewhere with Sam",
    topic: "Stories",
    duration: 62.61,
    description: "An original fictional story about an unexpected detour.",
    source: require("../../assets/audio/wrong-train.wav"),
  },
  {
    id: "octopus",
    title: "A different way to have a mind.",
    creator: "Small Wonders",
    topic: "Science",
    duration: 60.16,
    description:
      "Meet the extraordinary intelligence of the octopus. Demo narration.",
    source: require("../../assets/audio/octopus.wav"),
  },
  {
    id: "plants",
    title: "I bought a plant. Now I have a manager.",
    creator: "Life with Jules",
    topic: "Comedy",
    duration: 58.1,
    description: "An original fictional monologue for reluctant plant parents.",
    source: require("../../assets/audio/plants.wav"),
  },
  {
    id: "internet",
    title: "The internet is mostly under the ocean.",
    creator: "Future, Briefly",
    topic: "Technology",
    duration: 58.7,
    description:
      "The physical journey behind a wireless world. Demo narration.",
    source: require("../../assets/audio/internet.wav"),
  },
  {
    id: "moon",
    title: "The Moon is slowly saying goodbye.",
    creator: "Small Wonders",
    topic: "Science",
    duration: 55.5,
    description:
      "A tiny change across an extraordinary distance. Demo narration.",
    source: require("../../assets/audio/moon.wav"),
  },
];
