# Physical-device acceptance checks

Status: **not yet run**. The development machine has no connected Android device or configured Android SDK, and cannot run an iOS simulator. A native bundle export is not evidence that these device behaviors pass.

Test a development build on an iPhone and an Android phone, using speaker, Bluetooth headphones, and a car audio connection where practical.

| Area | Acceptance check |
| --- | --- |
| First launch | Select interests, consent to autoplay, reach one listening screen without scrolling a feed. |
| Queue | Listen through at least 4 clips with screen on, then lock for 15 minutes. Native queue continues; controls still respond. |
| Lock screen | Play/pause, next/previous, seek where available; metadata follows the current clip. |
| Interruptions | Navigation instruction, call, Siri/Assistant and alarm; Echo pauses/ducks appropriately, never overwhelms navigation. Verify resumption separately on both platforms. |
| Bluetooth | Headset buttons, reconnect, car route changes, disconnection. Disconnect must not unexpectedly blast audio from phone speakers. |
| Voice | Enable hands-free; say Hey Echo + each command, including topic/title/saved playback. Confirm exactly one action per utterance and return to waiting. Test standalone Hey Echo then a command within eight seconds. Unprefixed commands outside this window must do nothing. |
| Cancellation | Cancel during permission, startup, interim speech, final result, and between native cycles. UI must reset immediately, pending actions must not run, and the OS microphone indicator must go off. Repeat enable/cancel rapidly. |
| Privacy | Airplane mode plus installed offline English model works. Missing model fails gracefully; no network-recognition fallback. Confirm no persisted audio or transcripts. |
| Background voice | Start while visible, switch apps, lock for 15 minutes, then say Hey Echo skip/pause/play. Test with audio playing and paused. Force-close and confirm the mic/service stop and do not restart. |
| Android service | Fresh Android 13+ native build; notification visible while enabled, stop action turns mic off, headphones required, disconnection ends session. Verify foreground-service permissions and wake-lock release. |
| Save/follow | Repeat the command twice; item remains saved/followed. No toggling back off. |
| Unknown speech | “Do not play”, conversational sentences and silence never trigger an action. |
| Permissions | Deny mic/speech permissions, retry, and restore in Settings. Playback remains usable. |
| Recording | Record, stop, preview, save, force-close/reopen. The file survives. 180-second native cap works. Backgrounding ends recording. |
| Upload | Import MP3/M4A/WAV, over-20-MB file, invalid audio and >3-minute audio. Invalid content cannot be published. |
| Persistence | Preferences, saved clips, follows and local audio survive restart. |
| Accessibility | VoiceOver/TalkBack, large text, smallest supported phone screen; primary controls remain reachable and labeled. |

## Hands-free acceptance — pending

The current implementation uses continuous on-device speech with a wake-phrase gate, not a low-power keyword model. Verify wake detection while simultaneously playing audio, locked and backgrounded. Play clips containing the words “Hey Echo skip” and confirm playback does not trigger actions; test speaker echo cancellation on iOS and headphones on Android. Measure battery consumption, recognition gaps, Bluetooth routing, interruptions, and OS termination. Until physical-device checks pass, this remains an experimental hands-free feature. Distribution requirements must be reviewed before store release.
