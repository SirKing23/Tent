import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Slide-up sheet used for dashboard notifications and account settings. */
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end"
      >
        <Pressable
          accessibilityLabel="Close sheet"
          accessibilityRole="button"
          className="absolute inset-0 bg-slate-900/40"
          onPress={onClose}
        />
        <View
          className="rounded-t-3xl bg-white px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        >
          <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-200" />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
