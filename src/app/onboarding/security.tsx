import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";

import { PinDots } from "../../features/auth/components/PinDots";
import { PinKeypad } from "../../features/auth/components/PinKeypad";
import {
  PIN_LENGTH,
  sanitizePinInput,
} from "../../features/auth/logic/pinValidation";
import {
  authenticateWithBiometrics,
  getBiometricCapability,
} from "../../features/auth/services/biometricService";
import { createPinCredential } from "../../features/auth/services/pinService";
import type { BiometricCapability } from "../../features/auth/types";
import { OnboardingScreen } from "../../features/onboarding/components/OnboardingScreen";
import { PrimaryButton } from "../../features/onboarding/components/PrimaryButton";
import { useOnboardingDraft } from "../../features/onboarding/providers/OnboardingProvider";

type PinStage = "create" | "confirm" | "ready";

export default function SecuritySetupScreen() {
  const router = useRouter();
  const { draft, setPinCredential, setBiometricEnabled } = useOnboardingDraft();

  const [stage, setStage] = useState<PinStage>(
    draft.pinCredential ? "ready" : "create",
  );
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSecuring, setIsSecuring] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);

  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [isEnablingBiometrics, setIsEnablingBiometrics] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getBiometricCapability().then((result) => {
      if (active) setCapability(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const finishEntry = async (value: string) => {
    if (stage === "create") {
      setFirstPin(value);
      setPin("");
      setStage("confirm");
      return;
    }

    if (value !== firstPin) {
      setError("Those PINs don't match. Please start again.");
      setFirstPin("");
      setPin("");
      setStage("create");
      return;
    }

    setIsSecuring(true);
    try {
      const credential = await createPinCredential(value);
      setPinCredential(credential);
      setIsChangingPin(false);
      setStage("ready");
    } catch (hashError) {
      console.error("Unable to secure the PIN:", hashError);
      setError("Your PIN could not be secured. Please try again.");
      setFirstPin("");
      setStage("create");
    } finally {
      setPin("");
      setFirstPin("");
      setIsSecuring(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (isSecuring || stage === "ready") return;
    setError(null);
    const next = sanitizePinInput(pin + digit);
    setPin(next);
    if (next.length === PIN_LENGTH) void finishEntry(next);
  };

  const handleToggleBiometrics = async (next: boolean) => {
    setBiometricMessage(null);
    if (!next) {
      setBiometricEnabled(false);
      return;
    }

    setIsEnablingBiometrics(true);
    try {
      const result = await authenticateWithBiometrics(
        "Enable biometric unlock",
      );
      if (result.ok) {
        setBiometricEnabled(true);
      } else if (result.reason === "cancelled") {
        setBiometricMessage(
          "Biometric setup was cancelled. You can still unlock with your PIN.",
        );
      } else {
        setBiometricMessage(
          "Biometric verification failed. You can still unlock with your PIN.",
        );
      }
    } finally {
      setIsEnablingBiometrics(false);
    }
  };

  const resetPin = () => {
    setPin("");
    setFirstPin("");
    setError(null);
    setIsChangingPin(true);
    setStage("create");
  };

  if (!draft.fullName || !draft.email) {
    return <Redirect href="/onboarding/profile" />;
  }

  const prompt =
    stage === "confirm"
      ? "Enter the same 6 digits again"
      : "Enter a 6-digit PIN";

  return (
    <OnboardingScreen
      footer={
        <PrimaryButton
          disabled={!draft.pinCredential || isChangingPin}
          label="Continue"
          onPress={() => router.push("/onboarding/privacy")}
        />
      }
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/onboarding/profile")
      }
      step={3}
      subtitle="Your PIN protects your records when the app reopens. Only a secure hash is saved — never the PIN itself."
      title="Secure your app"
    >
      {stage === "ready" ? (
        <View className="items-center rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-8">
          <MaterialCommunityIcons
            name="shield-check"
            size={40}
            color="#059669"
          />
          <Text className="mt-3 text-base font-bold text-emerald-900">
            Your 6-digit PIN is set
          </Text>
          <Pressable
            accessibilityLabel="Change PIN"
            accessibilityRole="button"
            className="mt-4 rounded-xl border border-emerald-300 px-4 py-2 active:opacity-70"
            onPress={resetPin}
          >
            <Text className="text-sm font-semibold text-emerald-800">
              Change PIN
            </Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <Text className="mb-5 text-center text-sm font-semibold text-slate-600">
            {prompt}
          </Text>
          <PinDots filled={pin.length} hasError={Boolean(error)} />

          <View className="mt-4 min-h-10 items-center justify-center">
            {isSecuring ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#059669" size="small" />
                <Text className="ml-2 text-xs text-slate-500">
                  Securing your PIN…
                </Text>
              </View>
            ) : error ? (
              <Text className="px-4 text-center text-xs font-semibold text-red-600">
                {error}
              </Text>
            ) : null}
          </View>

          <PinKeypad
            disabled={isSecuring}
            onBackspace={() => setPin((current) => current.slice(0, -1))}
            onDigit={handleDigit}
          />
        </View>
      )}

      <View className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <View className="flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <MaterialCommunityIcons
              name="fingerprint"
              size={22}
              color="#475569"
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-900">
              {capability?.label ?? "Biometric unlock"}
            </Text>
            <Text className="mt-0.5 text-[11px] leading-4 text-slate-500">
              Optional. Use it instead of typing your PIN. Your PIN still works.
            </Text>
          </View>
          {capability === null ? (
            <ActivityIndicator color="#94A3B8" size="small" />
          ) : capability.available && capability.enrolled ? (
            <Switch
              accessibilityLabel="Enable biometric unlock"
              disabled={isEnablingBiometrics || !draft.pinCredential}
              onValueChange={(next) => void handleToggleBiometrics(next)}
              thumbColor="#FFFFFF"
              trackColor={{ false: "#CBD5E1", true: "#059669" }}
              value={draft.biometricEnabled}
            />
          ) : null}
        </View>

        {capability && (!capability.available || !capability.enrolled) ? (
          <Text className="mt-3 text-[11px] leading-4 text-slate-500">
            {capability.unavailableReason ??
              "Biometric unlock isn't available on this device."}
          </Text>
        ) : null}

        {biometricMessage ? (
          <Text className="mt-3 text-[11px] leading-4 text-amber-700">
            {biometricMessage}
          </Text>
        ) : null}

        <Text className="mt-3 text-[11px] leading-4 text-slate-400">
          Face or fingerprint data never leaves your device and is never stored
          by Tent.
        </Text>
      </View>
    </OnboardingScreen>
  );
}
