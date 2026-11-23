import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import { OnboardingScreen } from "../../features/onboarding/components/OnboardingScreen";
import { PrimaryButton } from "../../features/onboarding/components/PrimaryButton";
import {
  validateEmail,
  validateFullName,
  validateProfileInput,
  type ProfileFieldErrors,
} from "../../features/onboarding/logic/profileValidation";
import { useOnboardingDraft } from "../../features/onboarding/providers/OnboardingProvider";
import { getUserProfile } from "../../features/profile/services/userProfileRepository";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { draft, setProfile } = useOnboardingDraft();

  const [fullName, setFullName] = useState(draft.fullName);
  const [email, setEmail] = useState(draft.email);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [isPrefilling, setIsPrefilling] = useState(!draft.fullName && !draft.email);

  // Keep details entered on a previous install or a previous attempt.
  useEffect(() => {
    if (draft.fullName || draft.email) return;

    let active = true;
    void (async () => {
      const existing = await getUserProfile();
      if (!active) return;
      if (existing.fullName) setFullName((current) => current || existing.fullName);
      if (existing.email) setEmail((current) => current || existing.email);
      setIsPrefilling(false);
    })();

    return () => {
      active = false;
    };
  }, [draft.fullName, draft.email]);

  const handleContinue = () => {
    const validation = validateProfileInput({ fullName, email });
    setErrors(validation.errors);
    if (!validation.valid) return;

    setProfile(validation.values);
    router.push("/onboarding/security");
  };

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          disabled={isPrefilling}
          label="Continue"
          onPress={handleContinue}
        />
      }
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/onboarding/welcome")
      }
      step={2}
      subtitle="We use these details to personalize your dashboard. Nothing is sent online."
      title="Tell us about you"
    >
      {isPrefilling ? (
        <View className="mb-2 flex-row items-center">
          <ActivityIndicator color="#059669" size="small" />
          <Text className="ml-2 text-xs text-slate-500">
            Loading saved details…
          </Text>
        </View>
      ) : null}

      <Text className="mb-1.5 text-sm font-semibold text-slate-900">
        Full name
      </Text>
      <TextInput
        accessibilityLabel="Full name"
        autoCapitalize="words"
        autoComplete="name"
        autoCorrect={false}
        className={`h-14 rounded-2xl border bg-slate-50 px-4 text-base text-slate-900 ${
          errors.fullName ? "border-red-400" : "border-slate-200"
        }`}
        maxLength={80}
        onBlur={() =>
          setErrors((current) => ({
            ...current,
            fullName: validateFullName(fullName),
          }))
        }
        onChangeText={(value) => {
          setFullName(value);
          if (errors.fullName) {
            setErrors((current) => ({ ...current, fullName: undefined }));
          }
        }}
        placeholder="e.g. Juan Dela Cruz"
        placeholderTextColor="#94A3B8"
        returnKeyType="next"
        textContentType="name"
        value={fullName}
      />
      {errors.fullName ? (
        <Text className="mt-1.5 text-xs font-semibold text-red-600">
          {errors.fullName}
        </Text>
      ) : null}

      <Text className="mb-1.5 mt-5 text-sm font-semibold text-slate-900">
        Email address
      </Text>
      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        className={`h-14 rounded-2xl border bg-slate-50 px-4 text-base text-slate-900 ${
          errors.email ? "border-red-400" : "border-slate-200"
        }`}
        keyboardType="email-address"
        maxLength={254}
        onBlur={() =>
          setErrors((current) => ({
            ...current,
            email: validateEmail(email),
          }))
        }
        onChangeText={(value) => {
          setEmail(value);
          if (errors.email) {
            setErrors((current) => ({ ...current, email: undefined }));
          }
        }}
        onSubmitEditing={handleContinue}
        placeholder="you@example.com"
        placeholderTextColor="#94A3B8"
        returnKeyType="done"
        textContentType="emailAddress"
        value={email}
      />
      {errors.email ? (
        <Text className="mt-1.5 text-xs font-semibold text-red-600">
          {errors.email}
        </Text>
      ) : null}

      <View className="mt-6 flex-row items-start rounded-2xl bg-slate-50 p-4">
        <MaterialCommunityIcons
          name="email-outline"
          size={18}
          color="#059669"
        />
        <Text className="ml-2.5 flex-1 text-[12px] leading-5 text-slate-500">
          Your email is stored on this device. It is not verified and no email
          is sent during offline setup.
        </Text>
      </View>
    </OnboardingScreen>
  );
}
