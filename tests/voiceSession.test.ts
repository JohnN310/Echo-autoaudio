import test from "node:test";
import assert from "node:assert/strict";
import { VoiceSession } from "../src/services/VoiceSession.ts";
import type { VoiceDriver } from "../src/services/VoiceSession.ts";
import { requestedClips, wakeCommand } from "../src/domain/voiceRequest.ts";
import { EMPTY_LIBRARY } from "../src/domain/model.ts";
import type { Clip } from "../src/domain/model.ts";

function harness(overrides: Partial<VoiceDriver> = {}) {
  const calls = { start: 0, abort: 0, resume: 0, pause: 0, release: 0, commands: [] as unknown[] };
  const driver: VoiceDriver = {
    authorize: async () => {}, prepare: async () => {}, idle: async () => {},
    release: async () => { calls.release++; },
    start: () => { calls.start++; }, finish: () => {}, abort: () => { calls.abort++; },
    pause: () => { calls.pause++; return true; }, resume: () => { calls.resume++; },
    execute: (request) => { calls.commands.push(request); return { message: "Done", resume: false }; },
    update: () => {}, ...overrides,
  };
  return { session: new VoiceSession(driver), calls };
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

test("cancel resets immediately without native end, and rejects late results/start", async () => {
  const { session, calls } = harness();
  await session.enable();
  session.onResult("Hey Echo", false);
  const stopped = session.disable();
  assert.equal(session.state.phase, "off");
  session.onStart();
  session.onResult("Hey Echo skip", true);
  session.onEnd();
  await stopped;
  assert.equal(calls.commands.length, 0);
  assert.equal(calls.resume, 1);
  assert.equal(calls.start, 1);
  assert.ok(calls.abort >= 2);
});

test("cancel during permission prompt cannot start the microphone later", async () => {
  let allow!: () => void;
  const { session, calls } = harness({ authorize: () => new Promise<void>((r) => { allow = r; }) });
  const enabling = session.enable();
  await flush();
  await session.disable();
  session.onEnd();
  allow();
  await enabling;
  assert.equal(calls.start, 0);
  assert.equal(session.state.phase, "off");
});

test("cancel during native preparation serializes cleanup before a new session", async () => {
  let prepared!: () => void;
  let prepareCount = 0;
  const { session, calls } = harness({ prepare: () => ++prepareCount === 1
    ? new Promise<void>((r) => { prepared = r; }) : Promise.resolve() });
  const first = session.enable();
  await flush();
  const stopped = session.disable();
  const second = session.enable();
  prepared();
  await Promise.all([first, stopped, second]);
  assert.equal(calls.start, 1);
  assert.equal(calls.release, 1);
  await session.disable();
});

test("wake phrase required, final commands execute once, duplicates ignored", async () => {
  assert.equal(wakeCommand("I said hey echo skip"), null);
  const { session, calls } = harness();
  await session.enable();
  session.onResult("skip", false);
  assert.equal(calls.pause, 0);
  session.onResult("Hey Echo, skip", false);
  assert.equal(calls.commands.length, 0);
  session.onResult("Hey Echo, skip", true);
  session.onEnd();
  session.onEnd();
  session.onResult("Hey Echo, skip", true);
  assert.deepEqual(calls.commands, [{ kind: "control", command: "skip" }]);
  await session.disable();
});

test("cancel after final transcript but before native end drops pending command", async () => {
  const { session, calls } = harness();
  await session.enable();
  session.onResult("Hey Echo skip", true);
  await session.disable();
  session.onEnd();
  assert.equal(calls.commands.length, 0);
});

test("standalone wake grants one command; later commands require wake again", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { session, calls } = harness();
  await session.enable();
  session.onResult("Hey Echo", true);
  session.onEnd();
  t.mock.timers.tick(350); await flush();
  assert.equal(session.state.phase, "command");
  session.onResult("play my saved echoes", true);
  session.onEnd();
  t.mock.timers.tick(350); await flush();
  assert.equal(session.state.phase, "wake");
  session.onResult("skip", true);
  session.onEnd();
  assert.deepEqual(calls.commands, [{ kind: "content", query: "my saved echoes" }]);
  await session.disable();
});

test("wake window expires and missing end cannot leave UI stuck", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { session, calls } = harness();
  await session.enable();
  session.onResult("Hey Echo", true);
  session.onEnd();
  t.mock.timers.tick(350); await flush();
  t.mock.timers.tick(8000);
  session.onResult("skip", true);
  t.mock.timers.tick(4000); await flush();
  assert.equal(session.state.phase, "off");
  assert.equal(calls.commands.length, 0);
  assert.equal(calls.resume, 1);
});

test("partial wake retracted by final transcript does not authorize a command", async () => {
  const { session, calls } = harness();
  await session.enable();
  session.onResult("Hey Echo", false);
  session.onResult("skip", true);
  session.onEnd();
  assert.equal(calls.commands.length, 0);
  await session.disable();
});

test("microphone errors end the session without a retry loop", async () => {
  const { session, calls } = harness();
  await session.enable();
  session.onError("audio-capture");
  session.onEnd();
  await flush();
  assert.equal(session.state.phase, "off");
  assert.equal(calls.start, 1);
});

test("content selection honors saved and hidden clips, topics, and titles", () => {
  const clips: Clip[] = [
    { id: "moon", title: "The Moon is slowly saying goodbye", creator: "Small Wonders", topic: "Science", duration: 55, description: "", source: 1 },
    { id: "hidden", title: "Hidden", creator: "Small Wonders", topic: "Science", duration: 60, description: "", source: 2 },
  ];
  const library = { ...EMPTY_LIBRARY, saved: ["moon"], hidden: ["hidden"] };
  for (const query of ["science", "science stories", "my saved echoes", "the moon is slowly saying goodbye"])
    assert.deepEqual(requestedClips(query, clips, library).map((c) => c.id), ["moon"]);
  assert.deepEqual(requestedClips("missing song", clips, library), []);
});

test("continuous iOS capture stays open through wake, command, and prolonged paused playback", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { session, calls } = harness({ continuousCapture: true, pause: () => false });
  await session.enable();
  t.mock.timers.tick(180000);
  assert.equal(calls.abort, 0);
  session.onResult("Hey Echo", true);
  assert.equal(session.state.phase, "command");
  assert.equal(calls.abort, 0);
  session.onResult("play", true);
  assert.deepEqual(calls.commands, [{ kind: "control", command: "play" }]);
  assert.equal(session.state.phase, "wake");
  t.mock.timers.tick(180000);
  session.onResult("Hey Echo pause", true);
  assert.equal(calls.commands.length, 2);
  assert.equal(calls.start, 1);
  assert.equal(calls.abort, 0);
  await session.disable();
  assert.equal(calls.abort, 1);
});

test("continuous capture ignores ambient speech and resumes after command timeout without stopping mic", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { session, calls } = harness({ continuousCapture: true });
  await session.enable();
  session.onResult("Hi Echo", true);
  session.onResult("ordinary background speech", true);
  assert.equal(calls.pause, 0);
  session.onResult("Hey Echo", true);
  t.mock.timers.tick(8000);
  assert.equal(session.state.phase, "wake");
  assert.equal(calls.resume, 1);
  assert.equal(calls.abort, 0);
  session.onResult("skip", true);
  assert.equal(calls.commands.length, 0);
  await session.disable();
});

test("real iOS capture end disables hands-free instead of restarting from background JS", async () => {
  const { session, calls } = harness({ continuousCapture: true });
  await session.enable();
  session.onEnd();
  await flush();
  assert.equal(session.state.phase, "off");
  assert.equal(calls.start, 1);
});

test("native async startup rejection clears the mic state and reports the reason", async () => {
  const { session } = harness({ continuousCapture: true, start: async () => { throw new Error("Input route unavailable"); } });
  await session.enable();
  await flush();
  assert.equal(session.state.phase, "off");
  assert.match(session.state.message, /Input route unavailable/);
});
