import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

import type { BiometricCapability, BiometricResult } from "../types";

const getLabel = (types: LocalAuthentication.AuthenticationType[]): string => {
  if (
    types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
  ) {
    return Platform.OS === "ios" ? "Face ID" : "Face unlock";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "Fingerprint";
  }
  return "Biometrics";
};

/**
 * Reports whether this device can currently offer biometric unlock. Never
 * reads or stores biometric data — only the OS-reported capability.
 */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === "web") {
    return {
      available: false,
      enrolled: false,
      label: "Biometrics",
      types: [],
      unavailableReason:
        "Biometric unlock is only available in the mobile app. Use your PIN instead.",
    };
  }

  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    if (!hasHardware) {
      return {
        available: false,
        enrolled: false,
        label: "Biometrics",
        types,
        unavailableReason:
          "This device has no Face ID or fingerprint sensor. You can keep using your PIN.",
      };
    }

    if (!isEnrolled) {
      return {
        available: true,
        enrolled: false,
        label: getLabel(types),
        types,
        unavailableReason: `Set up ${getLabel(types)} in your device settings to use it here. You can keep using your PIN.`,
      };
    }

    return {
      available: true,
      enrolled: true,
      label: getLabel(types),
      types,
    };
  } catch {
    return {
      available: false,
      enrolled: false,
      label: "Biometrics",
      types: [],
      unavailableReason:
        "Biometric unlock could not be checked on this device. You can keep using your PIN.",
    };
  }
}

/** Shows the operating system's biometric prompt. No biometric data is read. */
export async function authenticateWithBiometrics(
  promptMessage = "Unlock Tent",
): Promise<BiometricResult> {
  if (Platform.OS === "web") return { ok: false, reason: "unavailable" };

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Use PIN",
      fallbackLabel: "",
      disableDeviceFallback: true,
    });

    if (result.success) return { ok: true };

    switch (result.error) {
      case "lockout":
        return { ok: false, reason: "lockout" };
      case "user_cancel":
      case "app_cancel":
      case "system_cancel":
      case "user_fallback":
        return { ok: false, reason: "cancelled" };
      case "not_enrolled":
      case "not_available":
      case "passcode_not_set":
        return { ok: false, reason: "unavailable" };
      default:
        return { ok: false, reason: "failed" };
    }
  } catch {
    return { ok: false, reason: "failed" };
  }
}
