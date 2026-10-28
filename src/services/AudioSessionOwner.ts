// Keep playback calls from reconfiguring AVAudioSession underneath live capture.
// Native voice owns the category/mode after this one-time recording setup.
export class AudioSessionOwner {
  private voice = false;
  private voiceSetup: Promise<void> | undefined;
  private serial: Promise<void> = Promise.resolve();
  private apply: (recording: boolean) => Promise<void>;
  constructor(apply: (recording: boolean) => Promise<void>) { this.apply = apply; }

  setVoiceActive(active: boolean) {
    if (this.voice !== active) this.voiceSetup = undefined;
    this.voice = active;
  }

  configure(): Promise<void> {
    if (this.voice && this.voiceSetup) return this.voiceSetup;
    const recording = this.voice;
    const pending = this.serial.catch(() => {}).then(() => this.apply(recording));
    this.serial = pending;
    if (recording) {
      this.voiceSetup = pending;
      void pending.catch(() => {
        if (this.voiceSetup === pending) this.voiceSetup = undefined;
      });
    }
    return pending;
  }
}
