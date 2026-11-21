import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Animated, Text } from "react-native";

export type ToastTone = "success" | "error" | "info";

export type ToastMessage = {
  message: string;
  tone: ToastTone;
};

const toneStyles: Record<
  ToastTone,
  { background: string; icon: "check-circle" | "alert-circle" | "information" }
> = {
  success: { background: "#059669", icon: "check-circle" },
  error: { background: "#E11D48", icon: "alert-circle" },
  info: { background: "#0F172A", icon: "information" },
};

export function Toast({
  toast,
  onHide,
}: {
  toast: ToastMessage | null;
  onHide: () => void;
}) {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;

    opacity.setValue(0);
    Animated.spring(opacity, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onHide();
      });
    }, 2600);

    return () => {
      clearTimeout(timer);
      opacity.stopAnimation();
    };
  }, [onHide, opacity, toast]);

  if (!toast) return null;

  const tone = toneStyles[toast.tone];

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      className="absolute bottom-5 left-4 right-4 flex-row items-center rounded-2xl px-4 py-3"
      style={{
        backgroundColor: tone.background,
        opacity,
        transform: [
          {
            translateY: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }}
    >
      <MaterialCommunityIcons name={tone.icon} size={19} color="#FFFFFF" />
      <Text className="ml-2 flex-1 text-sm font-medium text-white">
        {toast.message}
      </Text>
    </Animated.View>
  );
}
