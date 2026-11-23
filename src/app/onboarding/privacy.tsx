import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useAuth } from "../../features/auth/hooks/useAuth";
import { OnboardingScreen } from "../../features/onboarding/components/OnboardingScreen";
import { PrimaryButton } from "../../features/onboarding/components/PrimaryButton";
import { useOnboardingDraft } from "../../features/onboarding/providers/OnboardingProvider";
import { PRIVACY_NOTICE_VERSION } from "../../features/onboarding/types";

const NOTICE_POINTS = [
  {
    icon: "cellphone-lock" as const,
    title: "Stored on this device",
    body: "Your profile, cashbooks, bills, and PIN hash live in this device's local database.",
  },
  {
    icon: "wifi-off" as const,
    title: "Works offline",
    body: "Tent does not need an internet connection. No email is sent and your address is not verified.",
  },
  {
    icon: "cloud-outline" as const,
    title: "Future cloud sync",
    body: "A later version may sync data with a cloud service. If that happens, this notice will be updated before any data is transmitted.",
  },
  {
    icon: "shield-key-outline" as const,
    title: "Your responsibility",
    body: "Keep access to your device and remember your PIN. A lost PIN cannot be recovered by us.",
  },
];

export default function PrivacyConsentScreen() {
  const router = useRouter();
  const { saveOnboarding } = useAuth();
  const { draft, setPrivacyAcceptedAt } = useOnboardingDraft();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!draft.pinCredential) {
    return <Redirect href="/onboarding/security" />;
  }

  const accepted = Boolean(draft.privacyAcceptedAt);

  const handleContinue = async () => {
    if (!accepted || isSaving) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await saveOnboarding(draft);
      router.push("/onboarding/complete");
    } catch (error) {
      console.error("Unable to finish onboarding:", error);
      setSaveError(
        "We couldn't save your setup. Check the app storage and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OnboardingScreen
      footer={
        <View>
          {saveError ? (
            <Text className="mb-2 text-xs font-semibold text-red-600">
              {saveError}
            </Text>
          ) : null}
          <PrimaryButton
            disabled={!accepted}
            label="Agree and Continue"
            loading={isSaving}
            onPress={() => void handleContinue()}
          />
        </View>
      }
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/onboarding/security")
      }
      step={4}
      subtitle="A quick look at where your information lives before you start."
      title="Your privacy"
    >
      <View className="rounded-3xl border border-slate-200 bg-white">
        {NOTICE_POINTS.map((point, index) => (
          <View
            key={point.title}
            className={`flex-row px-4 py-4 ${
              index === 0 ? "" : "border-t border-slate-100"
            }`}
          >
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <MaterialCommunityIcons
                color="#059669"
                name={point.icon}
                size={20}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">
                {point.title}
              </Text>
              <Text className="mt-1 text-[12px] leading-5 text-slate-500">
                {point.body}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityLabel="Accept the privacy notice"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        className="mt-5 flex-row items-center rounded-2xl bg-slate-50 px-4 py-4 active:opacity-80"
        onPress={() =>
          setPrivacyAcceptedAt(
            accepted ? null : new Date().toISOString(),
          )
        }
      >
        <View
          className={`mr-3 h-6 w-6 items-center justify-center rounded-md border-2 ${
            accepted
              ? "border-emerald-600 bg-emerald-600"
              : "border-slate-300 bg-white"
          }`}
        >
          {accepted ? (
            <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
          ) : null}
        </View>
        <Text className="flex-1 text-[13px] leading-5 text-slate-700">
          I have read and accept this privacy notice.
        </Text>
      </Pressable>

      <Text className="mt-3 text-center text-[10px] uppercase tracking-[1.5px] text-slate-400">
        Privacy notice version {PRIVACY_NOTICE_VERSION}
      </Text>
    </OnboardingScreen>
  );
}
