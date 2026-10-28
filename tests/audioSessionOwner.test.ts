import test from "node:test";
import assert from "node:assert/strict";
import { AudioSessionOwner } from "../src/services/AudioSessionOwner.ts";

test("play/skip/resume reuse voice setup without changing the active native audio mode", async () => {
  const applied: boolean[] = [];
  const owner = new AudioSessionOwner(async (recording) => { applied.push(recording); });
  await owner.configure();
  owner.setVoiceActive(true);
  await Promise.all([owner.configure(), owner.configure(), owner.configure()]);
  await owner.configure();
  assert.deepEqual(applied, [false, true]);
  owner.setVoiceActive(false);
  await owner.configure();
  assert.deepEqual(applied, [false, true, false]);
});

test("simultaneous playback, mic enable, and cancel apply modes in order", async () => {
  const applied: boolean[] = [];
  const owner = new AudioSessionOwner(async (recording) => { applied.push(recording); });
  const play = owner.configure();
  owner.setVoiceActive(true);
  const microphone = owner.configure();
  owner.setVoiceActive(false);
  const cancel = owner.configure();
  await Promise.all([play, microphone, cancel]);
  assert.deepEqual(applied, [false, true, false]);
});

test("failed audio setup does not poison future playback or voice retries", async () => {
  let attempts = 0;
  const owner = new AudioSessionOwner(async () => {
    if (++attempts === 1) throw new Error("Audio unavailable");
  });
  owner.setVoiceActive(true);
  await assert.rejects(owner.configure(), /Audio unavailable/);
  await owner.configure();
  assert.equal(attempts, 2);
});
