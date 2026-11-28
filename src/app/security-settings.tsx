import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PinDots } from "../features/auth/components/PinDots";
import { PinKeypad } from "../features/auth/components/PinKeypad";
import { useAuth } from "../features/auth/hooks/useAuth";
import {
  formatLockCountdown,
  getRemainingLockMs,
} from "../features/auth/logic/pinPolicy";
import {
  PIN_LENGTH,
  sanitizePinInput,
} from "../features/auth/logic/pinValidation";
import { getBiometricCapability } from "../features/auth/services/biometricService";
import type { BiometricCapability } from "../features/auth/types";

type PinStage = "idle" | "current" | "next" | "confirm";

const STAGE_COPY: Record<Exclude<PinStage, "idle">, string> = {
  current: "Enter your current PIN",
  next: `Enter a new ${PIN_LENGTH}-digit PIN`,
  confirm: `Enter the new PIN again`,
};

export default function SecuritySettingsScreen() {
  const {
    appLockEnabled,
    biometricEnabled,
    isUnlocking,
    pinLength,
    changePin,
    setAppLockEnabled,
    setBiometricEnabled,
  } = useAuth();

  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [isChangingBiometrics, setIsChangingBiometrics] = useState(false);

  const [stage, setStage] = useState<PinStage>("idle");
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const lockoutRemainingMs = getRemainingLockMs(lockedUntil, nowMs);
  const isBusy = isUnlocking || lockoutRemainingMs > 0;

  useEffect(() => {
    let active = true;
    void getBiometricCapability().then((result) => {
      if (active) setCapability(result);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const resetPinFlow = () => {
    setStage("idle");
    setPin("");
    setCurrentPin("");
    setNewPin("");
    setPinError(null);
  };

  const submitPin = async (value: string) => {
    setPin("");

    if (stage === "current") {
      setCurrentPin(value);
      setStage("next");
      return;
    }

    if (stage === "next") {
      setNewPin(value);
      setStage("confirm");
      return;
    }

    if (stage !== "confirm") return;

    if (value !== newPin) {
      setPinError("Those PINs don't match. Start again.");
      setCurrentPin("");
      setNewPin("");
      setStage("current");
      return;
    }

    try {
      const result = await changePin(currentPin, newPin);
      if (result.ok) {
        resetPinFlow();
        Alert.alert("PIN updated", `Your new ${PIN_LENGTH}-digit PIN is active.`);
        return;
      }

      if (result.reason === "locked") {
        setNowMs(Date.now());
        setLockedUntil(result.lockedUntil);
        setPinError(
          `Too many attempts. Try again in ${formatLockCountdown(result.remainingMs)}.`,
        );
        setCurrentPin("");
        setNewPin("");
        setStage("current");
        return;
      }

      setPinError(
        result.reason === "incorrect"
          ? "Incorrect current PIN. Start again."
          : "Your PIN is not available. Restart the app and try again.",
      );
      setCurrentPin("");
      setNewPin("");
      setStage("current");
    } catch (error) {
      console.error("Unable to change the PIN:", error);
      setPinError("Your PIN could not be saved. Please try again.");
      setCurrentPin("");
      setNewPin("");
      setStage("current");
    }
  };

  const handleDigit = (digit: string) => {
    if (isBusy) return;
    setPinError(null);
    const limit =
      stage === "current" || stage === "idle" ? pinLength : PIN_LENGTH;
    const next = sanitizePinInput(pin + digit, limit);
    setPin(next);
    if (next.length === limit) void submitPin(next);
  };

  const handleToggleAppLock = (next: boolean) => {
    if (next) {
      void setAppLockEnabled(true);
      return;
    }

    Alert.alert(
      "Turn off app lock?",
      "Anyone who picks up this phone can open Tent and see your records without a PIN.",
      [
        { text: "Keep app lock", style: "cancel" },
        {
          text: "Turn off",
          style: "destructive",
          onPress: () => void setAppLockEnabled(false),
        },
      ],
    );
  };

  const handleToggleBiometrics = async (next: boolean) => {
    setIsChangingBiometrics(true);
    setPinError(null);
    try {
      const result = await setBiometricEnabled(next);
      if (result.ok) return;

      Alert.alert(
        "Biometric unlock unavailable",
        "Tent couldn't confirm your fingerprint or face. You can keep unlocking with your PIN.",
      );
    } catch (error) {
      console.error("Unable to change biometric unlock:", error);
      Alert.alert(
        "Biometric unlock unavailable",
        "Please try again, or keep using your PIN.",
      );
    } finally {
      setIsChangingBiometrics(false);
    }
  };

  const isPinFlowOpen = stage !== "idle";
  const biometricsSupported = Boolean(capability?.available && capability.enrolled);

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fc]" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "Security" }} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-2xl border border-slate-200 bg-white">
          <View className="flex-row items-center border-b border-slate-100 p-4">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <MaterialCommunityIcons
                color="#059669"
                name="lock-outline"
                size={22}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">
                App lock
              </Text>
              <Text className="mt-0.5 text-[11px] leading-4 text-slate-500">
                Ask for the PIN after a minute away or two minutes untouched.
              </Text>
            </View>
            <Switch
              accessibilityLabel="App lock"
              onValueChange={handleToggleAppLock}
              thumbColor="#FFFFFF"
              trackColor={{ false: "#CBD5E1", true: "#059669" }}
              value={appLockEnabled}
            />
          </View>

          <View className="flex-row items-center p-4">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <MaterialCommunityIcons
                color="#475569"
                name="fingerprint"
                size={22}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">
                {capability?.label ?? "Biometric unlock"}
              </Text>
              <Text className="mt-0.5 text-[11px] leading-4 text-slate-500">
                {capability && !biometricsSupported
                  ? (capability.unavailableReason ??
                    "Not available on this device. Use your PIN.")
                  : "Use it instead of typing your PIN."}
              </Text>
            </View>
            {capability === null ? (
              <ActivityIndicator color="#94A3B8" size="small" />
            ) : biometricsSupported ? (
              <Switch
                accessibilityLabel="Biometric unlock"
                disabled={isChangingBiometrics || !appLockEnabled}
                onValueChange={(next) => void handleToggleBiometrics(next)}
                thumbColor="#FFFFFF"
                trackColor={{ false: "#CBD5E1", true: "#059669" }}
                value={biometricEnabled}
              />
            ) : null}
          </View>
        </View>

        {isPinFlowOpen ? (
          <View className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-slate-900">
                {STAGE_COPY[stage as Exclude<PinStage, "idle">]}
              </Text>
              <Pressable
                accessibilityLabel="Cancel PIN change"
                accessibilityRole="button"
                className="rounded-lg border border-slate-200 px-3 py-1 active:opacity-70"
                onPress={resetPinFlow}
              >
                <Text className="text-xs font-semibold text-slate-600">
                  Cancel
                </Text>
              </Pressable>
            </View>

            <View className="mt-6">
              <PinDots
                hasError={Boolean(pinError)}
                filled={pin.length}
                length={
                  stage === "current" ? pinLength : PIN_LENGTH
                }
              />
            </View>

            <View className="mt-3 min-h-10 items-center justify-center">
              {isUnlocking ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#059669" size="small" />
                  <Text className="ml-2 text-xs text-slate-500">
                    Saving your PIN…
                  </Text>
                </View>
              ) : pinError ? (
                <Text className="px-4 text-center text-xs font-semibold text-red-600">
                  {pinError}
                </Text>
              ) : null}
            </View>

            <PinKeypad
              disabled={isBusy}
              onBackspace={() => setPin((value) => value.slice(0, -1))}
              onDigit={handleDigit}
            />
          </View>
        ) : (
          <Pressable
            accessibilityLabel="Change PIN"
            accessibilityRole="button"
            className="mt-6 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4 active:opacity-80"
            onPress={() => {
              setPinError(null);
              setPin("");
              setStage("current");
            }}
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <MaterialCommunityIcons
                color="#475569"
                name="dialpad"
                size={22}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">
                Change PIN
              </Text>
              <Text className="mt-0.5 text-[11px] leading-4 text-slate-500">
                {pinLength > PIN_LENGTH
                  ? `Your PIN still has ${pinLength} digits. Set a new ${PIN_LENGTH}-digit PIN here.`
                  : `Your PIN has ${PIN_LENGTH} digits.`}
              </Text>
            </View>
            <MaterialCommunityIcons
              color="#94A3B8"
              name="chevron-right"
              size={22}
            />
          </Pressable>
        )}

        <Text className="mt-6 px-1 text-[11px] leading-4 text-slate-400">
          Only a secure hash of your PIN is stored. Face or fingerprint data
          never leaves your device and is never stored by Tent.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
