import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Modal, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { EchoProvider, useEcho } from "./src/context/EchoContext";
import { ListenScreen } from "./src/screens/ListenScreen";
import { LibraryScreen } from "./src/screens/LibraryScreen";
import { CreateScreen } from "./src/screens/CreateScreen";
import { PreferencesScreen } from "./src/screens/PreferencesScreen";
import { VoiceInfoScreen } from "./src/screens/VoiceInfoScreen";
import { colors, shared } from "./src/theme";
type Screen = "library" | "create" | "preferences" | "voice" | null;
function EchoApp() {
  const echo = useEcho();
  const [screen, setScreen] = useState<Screen>(null);
  useEffect(() => {
    if (!echo.ready) return;
    const open = (url: string | null | undefined) => {
      const id = url?.match(/^echo:\/\/clip\/([a-z0-9-]+)$/i)?.[1];
      const clip = echo.allClips.find((c) => c.id === id);
      if (clip) echo.start(clip, false);
    };
    void Linking.getInitialURL().then(open);
    const listener = Linking.addEventListener("url", (e) => open(e.url));
    return () => listener.remove();
  }, [echo.ready]);
  if (!echo.ready)
    return (
      <View style={[shared.screen, { justifyContent: "center" }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  return (
    <SafeAreaView style={shared.screen}>
      <StatusBar style="light" />
      {echo.library.preferences.onboarded ? (
        <ListenScreen
          onLibrary={() => setScreen("library")}
          onCreate={() => setScreen("create")}
          onSettings={() => setScreen("preferences")}
          onVoiceInfo={() => setScreen("voice")}
        />
      ) : (
        <PreferencesScreen onboarding onClose={() => {}} />
      )}
      <Modal
        visible={screen !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setScreen(null)}
      >
        <SafeAreaView style={shared.screen}>
          {screen === "library" ? (
            <LibraryScreen onClose={() => setScreen(null)} />
          ) : screen === "create" ? (
            <CreateScreen onClose={() => setScreen(null)} />
          ) : screen === "preferences" ? (
            <PreferencesScreen onClose={() => setScreen(null)} />
          ) : screen === "voice" ? (
            <VoiceInfoScreen onClose={() => setScreen(null)} />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <EchoProvider>
        <EchoApp />
      </EchoProvider>
    </SafeAreaProvider>
  );
}
