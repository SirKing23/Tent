import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ONBOARDING_STEP_COUNT } from "../types";
import { StepProgress } from "./StepProgress";

type OnboardingScreenProps = PropsWithChildren<{
  step: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  footer?: ReactNode;
}>;

/** Shared shell: safe area, progress, keyboard-aware scroll, sticky footer. */
export function OnboardingScreen({
  step,
  title,
  subtitle,
  onBack,
  footer,
  children,
}: OnboardingScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mt-2 flex-row items-center">
            {onBack ? (
              <Pressable
                accessibilityLabel="Go back"
                accessibilityRole="button"
                className="-ml-2 h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
                onPress={onBack}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={28}
                  color="#0F172A"
                />
              </Pressable>
            ) : null}
            <View className="ml-auto">
              <StepProgress step={step} total={ONBOARDING_STEP_COUNT} />
            </View>
          </View>

          <Text className="mt-6 text-[28px] font-extrabold leading-9 text-slate-900">
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-2 text-[15px] leading-6 text-slate-500">
              {subtitle}
            </Text>
          ) : null}

          <View className="mt-7 flex-1">{children}</View>
        </ScrollView>

        {footer ? (
          <View className="border-t border-slate-100 bg-white px-6 pb-3 pt-3">
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
