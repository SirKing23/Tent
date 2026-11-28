import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Modal,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLogo } from "../../../../components/AppLogo";
import { getProfileFirstName } from "../../profile/logic/profile";
import { useAuth } from "../hooks/useAuth";
import {
  formatLockCountdown,
  getRemainingLockMs,
} from "../logic/pinPolicy";
import { sanitizePinInput } from "../logic/pinValidation";
import { PinDots } from "./PinDots";
import { PinKeypad } from "./PinKeypad";

/**
 * Full-screen PIN gate.
 *
 * Rendered as a modal window rather than a route so the app screens behind it
 * stay mounted: unlocking returns the user to the exact page they left, and
 * the window sits above any sheet or alert that was already open.
 */
export function LockScreen() {
  const {
    profile,
    biometricEnabled,
    isUnlocking,
    pinLength,
    unlockWithPin,
    unlockWithBiometrics,
  } = useAuth();

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);
  const autoPromptedRef = useRef(false);

  const remainingMs = getRemainingLockMs(lockedUntil, nowMs);
  const isLockedOut = remainingMs > 0;
  const isBusy = isUnlocking || isLockedOut;

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  // The lock screen owns the hardware back button while it is up.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  const handleBiometric = async () => {
    if (isBusy) return;
    setBiometricMessage(null);

    try {
      const result = await unlockWithBiometrics();
      if (result.ok) return;

      if (result.reason === "cancelled") {
        setBiometricMessage("Biometric unlock cancelled. Enter your PIN.");
      } else if (result.reason === "lockout") {
        setBiometricMessage(
          "Biometrics are temporarily unavailable. Enter your PIN.",
        );
      } else {
        setBiometricMessage("Biometric unlock failed. Enter your PIN.");
      }
    } catch {
      setBiometricMessage("Biometric unlock failed. Enter your PIN.");
    }
  };

  // Ask for biometrics once per lock screen, and only once the app is active.
  useEffect(() => {
    if (!biometricEnabled || autoPromptedRef.current) return;
    autoPromptedRef.current = true;

    const timer = setTimeout(() => {
      if (AppState.currentState === "active") void handleBiometric();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricEnabled]);

  const submitPin = async (value: string) => {
    setError(null);
    setPin("");

    try {
      const result = await unlockWithPin(value);
      if (result.ok) return;

      if (result.reason === "locked") {
        setNowMs(Date.now());
        setLockedUntil(result.lockedUntil);
        setError(
          `Too many attempts. Try again in ${formatLockCountdown(result.remainingMs)}.`,
        );
        return;
      }

      if (result.reason === "incorrect") {
        const attempts =
          result.attemptsRemaining === 1
            ? "1 attempt"
            : `${result.attemptsRemaining} attempts`;
        setError(`Incorrect PIN. ${attempts} left before a short lockout.`);
        return;
      }

      setError("Your PIN is not available. Restart the app and set it up again.");
    } catch {
      setError("Unable to check your PIN. Please try again.");
    }
  };

  const handleDigit = (digit: string) => {
    if (isBusy) return;
    setError(null);
    const next = sanitizePinInput(pin + digit, pinLength);
    setPin(next);
    if (next.length === pinLength) void submitPin(next);
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={() => {}}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible
    >
      <SafeAreaView
        accessibilityViewIsModal
        className="flex-1 bg-white"
        edges={["top", "bottom"]}
      >
        <View className="flex-1 justify-center px-6 pb-6">
          <View className="items-center">
            <AppLogo className="mb-5" size={68} />
            <Text className="text-2xl font-extrabold text-slate-900">
              Welcome back, {getProfileFirstName(profile.fullName)}
            </Text>
            <Text className="mt-1.5 text-sm text-slate-500">
              Enter your PIN to unlock Tent
            </Text>
          </View>

          <View className="mt-9">
            <PinDots
              filled={pin.length}
              hasError={Boolean(error)}
              length={pinLength}
            />
          </View>

          <View className="mt-4 min-h-12 items-center justify-center">
            {isUnlocking ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#059669" size="small" />
                <Text className="ml-2 text-xs text-slate-500">
                  Checking your PIN…
                </Text>
              </View>
            ) : error ? (
              <Text className="px-4 text-center text-xs font-semibold text-red-600">
                {error}
              </Text>
            ) : biometricMessage ? (
              <Text className="px-4 text-center text-xs font-semibold text-amber-700">
                {biometricMessage}
              </Text>
            ) : null}
          </View>

          <PinKeypad
            biometricLabel="Unlock with biometrics"
            disabled={isBusy}
            onBackspace={() => setPin((current) => current.slice(0, -1))}
            onBiometric={() => void handleBiometric()}
            onDigit={handleDigit}
            showBiometric={biometricEnabled && !isLockedOut}
          />

          <View className="mt-4 flex-row items-center justify-center">
            <MaterialCommunityIcons
              name="lock-outline"
              size={14}
              color="#94A3B8"
            />
            <Text className="ml-1.5 text-[11px] text-slate-400">
              Records are stored on this device
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
