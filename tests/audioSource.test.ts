import test from "node:test";
import assert from "node:assert/strict";
import { queueSource } from "../src/domain/audioSource.ts";

test("bundled audio reaches the native queue as a playable URI", () => {
  assert.deepEqual(queueSource(17, "Moon", (id) => {
    assert.equal(id, 17);
    return { localUri: "file:///bundle/moon.wav", uri: "https://assets/moon.wav" };
  }), { uri: "file:///bundle/moon.wav", name: "Moon" });
});

test("development assets and imported recordings retain their URIs", () => {
  assert.equal(queueSource(1, "Demo", () => ({ localUri: null, uri: "http://localhost:8081/moon.wav" })).uri,
    "http://localhost:8081/moon.wav");
  assert.equal(queueSource("file:///recording.m4a", "Mine", () => { throw new Error("Must not resolve imported files"); }).uri,
    "file:///recording.m4a");
});

test("missing asset locations fail instead of creating silent queue entries", () => {
  assert.throws(() => queueSource(1, "Missing", () => ({ localUri: null, uri: "" })), /Missing audio file/);
});
