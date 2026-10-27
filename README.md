# Echo — native, listening first

React Native + TypeScript, targeting **Android and iOS only**, using Expo SDK 58 development builds. There is no desktop or web target.

The home screen is a single listening surface: current echo, large playback controls, a subtle animated waveform, and one voice-command control. The native queue advances automatically. Library, recording, and preferences are secondary screens. No scrolling feed, engagement counters, or discovery cards interrupt listening.

## Run on a phone

```sh
npm install
npm run android
```

Android requires Android Studio's SDK, JDK, and an emulator or USB-connected device with debugging enabled. The command creates and runs a development build.

On macOS with Xcode:

```sh
npm run ios
```

For an already installed development build, run `npm start` and connect the phone to Metro. **Use a development build, not Expo Go**: offline speech recognition requires the custom native module.

For iOS builds from Windows, use EAS with your own Expo/Apple signing accounts:

```sh
npx eas-cli build --profile development --platform ios
```

`eas.json` also includes Android preview APK and iOS simulator profiles. No cloud build has been submitted, no signing credentials are included, and no app-store upload has been performed. Replace the development bundle/package identifier `com.echo.listening` with your own before distribution.

## Working implementation

- Native continuous audio playlist via `expo-audio`, bundled demo clips, seek, pause, skip, and previous.
- iOS audio background mode and Android media playback foreground service configured. The queue lives in the native player; JavaScript timers do not advance tracks.
- Lock-screen/notification metadata and native media controls. OS interruption behavior uses `doNotMix` so Echo does not intentionally play over higher-priority audio.
- Opt-in hands-free sessions using on-device English recognition, gated by **Hey Echo**. Controls: **Play, Pause, Skip, Go back, Save, Follow, Cancel**, plus play requests for available titles, creators, topics, and saved echoes. Saves/follows are idempotent.
- Requires offline recognition support. No network-recognition fallback, persisted command recordings, or saved transcripts. English speech model availability is device-dependent.
- Short onboarding, topic ranking, autoplay preference, creator follows, saved clips, search, deep links and native sharing.
- Native microphone recording with a native 180-second limit; stop on app background; document-picker import; preview; metadata; local audio-library storage under the app's documents directory.
- Local report/hide behavior. Sample content is clearly marked Demo in the library.

## Voice and hands-free boundaries

The microphone card enables a session, then listens for **Hey Echo** while playback continues. Say “Hey Echo, skip” in one utterance, or say “Hey Echo” followed by a command within eight seconds. Playback pauses after wake detection. A final transcript is required before an action executes. Tapping the card again immediately cancels pending commands, invalidates in-flight permission requests, and stops the microphone. Opening Create also stops the session before allowing recording.

This is an **experimental continuous on-device speech implementation**, not a dedicated low-power keyword model. It temporarily transcribes ambient speech locally to check for the wake phrase, without persisting or uploading audio/transcripts. It uses more battery than playback alone. Speaker identity cannot be authenticated by a wake phrase. iOS voice processing reduces playback feedback; Android requires headphones because its recognizer does not guarantee echo cancellation. No cloud recognition fallback is enabled.

Background sessions must be enabled while Echo is visible. iOS retains its audio background mode and a play-and-record session; Android 13+ uses the local `echo-voice-service` microphone foreground service with a visible notification and stop action. The Android service holds a wake lock only for the enabled session and never restarts after process death. Force-closing the app ends hands-free; calls, microphone conflicts, and OS resource restrictions may also end it. Sessions are not persisted or enabled on launch. A fresh native build is required, especially on Android; Expo Go does not contain the service.

Native background recognition, Bluetooth behavior, cancellation of the actual microphone, false activations, and battery consumption **have not been verified on devices**. See `DEVICE_TESTS.md` before treating this as commute-ready. Recognition has short gaps when native requests restart. Requests can play only audio already in the app's catalog; this does not search Spotify, YouTube, or the internet.

## Data and community boundaries

This build works locally without credentials. Preferences, follows, and saved IDs use AsyncStorage. User recordings remain on the phone; native sharing can share the audio file. Sample clip links use `echo://clip/<id>` and require Echo to be installed.

There is no Firebase Authentication, shared cloud feed, cloud publishing, production moderation queue, or cross-device sync yet. Local creator names are not authenticated identities. Reports hide content locally and are not submitted to a moderator. Completion rate is not treated as a strong positive ranking signal.

## Verify

```sh
npm run typecheck
npm test
npx expo-doctor
npm run export
```

The tests cover exact voice-command matching, rejection of incidental speech, duration limits, personalized ranking and hidden clips, and time formatting. Android and iOS exports validate native JS/Hermes bundling, not a signed APK/IPA or physical-device behavior.

The dependency audit currently reports five high-severity entries in the Expo CLI dependency chain (`node-forge` and `zod`, plus dependants). Its suggested automatic remediation downgrades Expo to SDK 44; that breaking downgrade was not applied. Recheck upstream tooling before release.

See [DEVICE_TESTS.md](DEVICE_TESTS.md) for the remaining device acceptance checks. Package configuration follows [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/) and the [speech recognition module](https://github.com/jamsch/expo-speech-recognition).

## Source map

- `src/screens/ListenScreen.tsx`: single-screen listening UI.
- `src/context/EchoContext.tsx`: native queue, media session, local state, and actions.
- `src/services/useVoiceCommands.ts`: recognition, playback, and native-service adapter.
- `src/services/VoiceSession.ts`: cancellable hands-free session and wake/command lifecycle.
- `src/domain/voiceRequest.ts`: wake phrase and content-request matching.
- `modules/echo-voice-service`: Android microphone foreground service and iOS English offline-capability check.
- `src/domain/model.ts`: command parser and ranking rules.
- `src/screens/CreateScreen.tsx`: record, import, preview, and local publish.
- `app.config.ts`: Android/iOS native permissions and background playback settings.

Audio assets are original demo scripts narrated with the Windows system voice. They are development fixtures, not an AI-content feature.
