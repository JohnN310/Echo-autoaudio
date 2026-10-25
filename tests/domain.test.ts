import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCommand,
  rankClips,
  validDuration,
  formatTime,
  EMPTY_LIBRARY,
} from "../src/domain/model.ts";
import type { Clip, Library } from "../src/domain/model.ts";
test("exact six voice commands, including wake phrase prefix", () => {
  for (const command of ["play", "pause", "skip", "go back", "save", "follow"])
    assert.equal(parseCommand(`Hey Echo, ${command}!`), command);
  assert.equal(parseCommand("  GO   BACK. "), "go back");
});
test("incidental speech must not trigger an action", () => {
  for (const text of [
    "do not play",
    "I want to save this for later",
    "skip the ads",
    "follow me home",
    "stop",
    "hey echo",
    "pause then play",
    "",
  ])
    assert.equal(parseCommand(text), null);
});
test("invalid and overlong audio cannot be published", () => {
  for (const n of [0, -1, NaN, Infinity, 180.1])
    assert.equal(validDuration(n), false);
  assert.equal(validDuration(1), true);
  assert.equal(validDuration(180), true);
});
test("ranking respects interests and follows, hides reported clips without mutating input", () => {
  const clip = (id: string, topic: Clip["topic"], creator: string): Clip => ({
    id,
    topic,
    creator,
    title: id,
    description: "",
    duration: 30,
    source: 1,
  });
  const clips = [
    clip("a", "Comedy", "A"),
    clip("b", "Science", "B"),
    clip("c", "Stories", "C"),
  ];
  const library: Library = {
    ...EMPTY_LIBRARY,
    preferences: { ...EMPTY_LIBRARY.preferences, interests: ["Science"] },
    followed: ["C"],
    hidden: ["a"],
  };
  assert.deepEqual(
    rankClips(clips, library).map((c) => c.id),
    ["c", "b"],
  );
  assert.deepEqual(
    clips.map((c) => c.id),
    ["a", "b", "c"],
  );
});
test("time display is stable for unloaded or invalid metadata", () => {
  assert.equal(formatTime(NaN), "0:00");
  assert.equal(formatTime(65.9), "1:05");
  assert.equal(formatTime(-1), "0:00");
});
