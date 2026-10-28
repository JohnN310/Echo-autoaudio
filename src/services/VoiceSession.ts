import { parseVoiceRequest, wakeCommand } from "../domain/voiceRequest.ts";
import type { VoiceRequest } from "../domain/voiceRequest.ts";

export type VoiceState = {
  phase: "off" | "starting" | "wake" | "command";
  message: string;
};
export interface VoiceDriver {
  continuousCapture?: boolean;
  authorize(isCurrent: () => boolean): Promise<void>;
  prepare(): Promise<void>;
  release(): Promise<void>;
  start(): void | Promise<void>;
  finish(): void;
  abort(): void;
  idle(): Promise<void>;
  pause(): boolean;
  resume(): void;
  execute(request: VoiceRequest): { message: string; resume: boolean };
  update(state: VoiceState): void;
}

// One owner for the microphone. Generation checks invalidate permissions, timers,
// and results from canceled sessions; UI cancellation never waits for native end.
export class VoiceSession {
  state: VoiceState = { phase: "off", message: "Enable hands-free. Say “Hey Echo”." };
  private generation = 0;
  private enabled = false;
  private accepting = false;
  private nativeCycleOpen = false;
  private wakeConfirmed = false;
  private hadSpeech = false;
  private awaitingCommand = false;
  private resumeAfterCommand = false;
  private pending: VoiceRequest | null = null;
  private cycleTimer?: ReturnType<typeof setTimeout>;
  private settleTimer?: ReturnType<typeof setTimeout>;
  private endTimer?: ReturnType<typeof setTimeout>;
  private restartTimer?: ReturnType<typeof setTimeout>;
  private cleanup: Promise<void> = Promise.resolve();
  private preparation: Promise<void> = Promise.resolve();
  private lastPartial = "";
  private emptyCycles = 0;
  private startedAt = 0;

  private driver: VoiceDriver;
  constructor(driver: VoiceDriver) { this.driver = driver; }

  private update(phase: VoiceState["phase"], message: string) {
    this.state = { phase, message };
    this.driver.update(this.state);
  }
  private clearTimers() {
    clearTimeout(this.cycleTimer);
    clearTimeout(this.settleTimer);
    clearTimeout(this.endTimer);
    clearTimeout(this.restartTimer);
  }

  async enable() {
    if (this.enabled) return;
    const generation = ++this.generation;
    this.enabled = true;
    this.update("starting", "Preparing offline voice… Tap to cancel.");
    try {
      await this.cleanup;
      if (!this.enabled || generation !== this.generation) return;
      await this.driver.authorize(() => this.enabled && generation === this.generation);
      if (!this.enabled || generation !== this.generation) return;
      this.preparation = this.driver.prepare();
      await this.preparation;
      if (!this.enabled || generation !== this.generation) {
        return;
      }
      await this.driver.idle();
      if (!this.enabled || generation !== this.generation) return;
      this.emptyCycles = 0;
      this.startCycle();
    } catch (error) {
      if (generation === this.generation)
        this.disable(error instanceof Error ? error.message : "Could not start offline voice.");
    }
  }

  disable(message = "Microphone off. Tap to enable hands-free.") {
    ++this.generation;
    this.enabled = false;
    this.accepting = false;
    this.nativeCycleOpen = false;
    this.wakeConfirmed = false;
    this.pending = null;
    this.awaitingCommand = false;
    this.carryWake = false;
    this.clearTimers();
    const resume = this.resumeAfterCommand;
    this.resumeAfterCommand = false;
    this.update("off", message);
    this.driver.abort();
    // Serialize teardown with the next enable, even when the native end is lost.
    this.cleanup = this.cleanup.catch(() => {}).then(async () => {
      await this.preparation.catch(() => {});
      try { await this.driver.idle(); }
      finally { await this.driver.release(); }
      if (resume) this.driver.resume();
    }).catch(() => {
      if (!this.enabled) this.update("off", "Voice stopped. If the microphone indicator stays on, reopen Echo.");
    });
    return this.cleanup;
  }

  private startCycle() {
    if (!this.enabled) return;
    this.accepting = true;
    this.nativeCycleOpen = true;
    this.hadSpeech = false;
    this.pending = null;
    this.lastPartial = "";
    this.startedAt = Date.now();
    this.update(this.awaitingCommand ? "command" : "wake",
      this.awaitingCommand ? "Say a command. Tap to turn the mic off." : "Say “Hey Echo”. Tap to turn the mic off.");
    const generation = this.generation;
    try {
      const starting = this.driver.start();
      if (starting) void starting.catch((error: unknown) => {
        if (this.enabled && generation === this.generation)
          void this.disable(error instanceof Error ? error.message : "Could not start the microphone.");
      });
    }
    catch { void this.disable("Could not start offline voice. Tap to retry."); return; }
    // Bounded recognizer requests avoid relying on an unlimited OS speech task.
    if (!this.driver.continuousCapture)
      this.cycleTimer = setTimeout(() => this.finishCycle(), this.awaitingCommand ? 8000 : 45000);
  }

  onStart() {
    if (!this.enabled || !this.accepting) this.driver.abort();
  }

  onResult(text: string, final: boolean) {
    if (!this.enabled || !this.accepting) return;
    if (text.trim()) this.hadSpeech = true;
    const afterWake = wakeCommand(text);
    if (!this.awaitingCommand && afterWake === null) {
      if (this.driver.continuousCapture) return;
      if (final) this.finishCycle();
      else this.settle(text);
      return;
    }
    if (!this.awaitingCommand) {
      this.awaitingCommand = true;
      this.resumeAfterCommand = this.driver.pause();
      this.update("command", "Listening for your command… Tap to turn the mic off.");
      clearTimeout(this.cycleTimer);
      this.cycleTimer = setTimeout(() => this.finishCycle(), 8000);
    }
    const commandText = afterWake ?? text;
    if (final) {
      // A speculative partial wake word cannot authorize a different final result.
      if (afterWake !== null) this.wakeConfirmed = true;
      this.pending = this.wakeConfirmed ? parseVoiceRequest(commandText) : null;
      // A standalone wake phrase grants one bounded follow-up utterance.
      if (!commandText && this.wakeConfirmed) {
        this.finishCycle(true);
      } else {
        this.finishCycle();
      }
    } else {
      this.settle(text);
    }
  }

  private settle(text: string) {
    // iOS delivers utterance boundaries natively while keeping its engine alive.
    if (this.driver.continuousCapture) return;
    if (text === this.lastPartial) return;
    this.lastPartial = text;
    clearTimeout(this.settleTimer);
    // Ask native recognition for its final transcript after a quiet interval.
    // Never execute a speculative interim transcript.
    this.settleTimer = setTimeout(() => {
      if (this.enabled && this.accepting) {
        this.armEndTimeout();
        this.driver.finish();
      }
    }, 1000);
  }

  private carryWake = false;
  private finishCycle(carryWake = false) {
    if (!this.enabled || !this.accepting) return;
    if (this.driver.continuousCapture) {
      clearTimeout(this.cycleTimer);
      if (carryWake) {
        this.cycleTimer = setTimeout(() => this.finishCycle(), 8000);
        return;
      }
      const request = this.pending;
      this.pending = null;
      this.awaitingCommand = false;
      this.wakeConfirmed = false;
      try {
        const result = request ? this.driver.execute(request) : null;
        if ((!result || result.resume) && this.resumeAfterCommand) this.driver.resume();
        this.resumeAfterCommand = false;
        this.update("wake", result ? `${result.message}. Say “Hey Echo” again.` : "Say “Hey Echo”. Tap to turn the mic off.");
      } catch {
        void this.disable("Could not run that command. Tap to retry.");
      }
      return;
    }
    this.accepting = false;
    this.carryWake = carryWake;
    clearTimeout(this.cycleTimer);
    clearTimeout(this.settleTimer);
    this.armEndTimeout();
    this.driver.abort();
  }
  private armEndTimeout() {
    clearTimeout(this.endTimer);
    this.endTimer = setTimeout(() => {
      if (this.enabled) void this.disable("Voice timed out. Tap to try again.");
    }, 4000);
  }

  onError(error: string) {
    if (!this.enabled || !this.nativeCycleOpen) return;
    if (error === "aborted" && !this.accepting) return;
    if (error === "no-speech" || error === "speech-timeout") {
      this.finishCycle();
      return;
    }
    void this.disable(error === "interrupted"
      ? "Voice interrupted. Tap to enable it again."
      : "Offline voice stopped. Check microphone permission and the English speech model.");
  }

  onEnd() {
    if (!this.enabled || !this.nativeCycleOpen) return;
    if (this.driver.continuousCapture) {
      void this.disable("Microphone capture ended. Reopen Echo to enable it again.");
      return;
    }
    this.nativeCycleOpen = false;
    this.accepting = false;
    this.clearTimers();
    const request = this.pending;
    this.pending = null;
    if (!this.carryWake) {
      this.awaitingCommand = false;
      this.wakeConfirmed = false;
      try {
        const result = request ? this.driver.execute(request) : null;
        if ((!result || result.resume) && this.resumeAfterCommand) this.driver.resume();
        if (result) this.update("wake", `${result.message}. Say “Hey Echo” for another command.`);
      } catch {
        void this.disable("Could not run that command. Tap to try again.");
        return;
      }
      this.resumeAfterCommand = false;
    }
    this.carryWake = false;
    // Back off and stop if the recognizer repeatedly ends immediately.
    this.emptyCycles = !this.hadSpeech && Date.now() - this.startedAt < 1500 ? this.emptyCycles + 1 : 0;
    if (this.emptyCycles >= 3) {
      void this.disable("Voice keeps stopping on this device. Tap to try again.");
      return;
    }
    const generation = this.generation;
    this.restartTimer = setTimeout(() => {
      void this.driver.idle().then(() => {
        if (this.enabled && generation === this.generation) this.startCycle();
      }).catch(() => {
        if (generation === this.generation) void this.disable("Voice did not stop cleanly. Tap to retry.");
      });
    }, 350);
  }
}
