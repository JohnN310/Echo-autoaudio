import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme";
export function ListeningOrb({
  playing,
  listening,
}: {
  playing: boolean;
  listening: boolean;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();
  const size = Math.min(width * 0.46, Math.max(80, (height - 570) * 0.65), 180);
  useEffect(() => {
    if (!playing && !listening) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [playing, listening]);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size + 40,
        height: size + 40,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          s.ring,
          {
            width: size + 34,
            height: size + 34,
            borderRadius: size,
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.25, 0.7],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1.05],
                }),
              },
            ],
          },
        ]}
      />
      <View
        style={[
          s.inner,
          { width: size + 12, height: size + 12, borderRadius: size },
        ]}
      />
      <LinearGradient
        colors={
          listening
            ? ["#d4d9a9", "#789577", "#354e40"]
            : ["#e8bf9e", "#b78064", "#465a49"]
        }
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[s.orb, { width: size, height: size, borderRadius: size }]}
      >
        <View style={s.wave}>
          {Array.from({ length: 15 }, (_, i) => (
            <Animated.View
              key={i}
              style={{
                backgroundColor: "#fff8e6",
                width: 3,
                height: 10 + Math.sin((i / 14) * Math.PI) * 37,
                borderRadius: 3,
                opacity: 0.75,
                transform: [
                  {
                    scaleY:
                      playing || listening
                        ? pulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [i % 2 ? 0.4 : 0.8, i % 2 ? 1 : 0.5],
                          })
                        : 0.3,
                  },
                ],
              }}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}
const s = StyleSheet.create({
  ring: { position: "absolute", borderWidth: 1, borderColor: colors.accent },
  inner: { position: "absolute", borderWidth: 1, borderColor: "#caa28733" },
  orb: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  wave: { flexDirection: "row", alignItems: "center", gap: 5 },
});
