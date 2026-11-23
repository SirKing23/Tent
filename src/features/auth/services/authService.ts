import { getUserProfile } from "../../profile/services/userProfileRepository";
import type { UserProfile } from "../../profile/types";
import { getSettings } from "../../settings/services/settingsRepository";
import type { AppSettings } from "../../settings/types";
import {
  getRemainingLockMs,
  getAttemptsRemaining,
} from "../logic/pinPolicy";
import type { PinVerificationResult } from "../types";
import {
  clearFailedAttempts,
  getSecurityRecord,
  registerFailedAttempt,
} from "./securityRepository";
import { verifyPin as verifyPinHash } from "./pinService";

export type AuthSnapshot = {
  settings: AppSettings;
  profile: UserProfile;
  hasPin: boolean;
  biometricEnabled: boolean;
};

/** Everything the auth provider needs to choose the next screen. */
export async function loadAuthSnapshot(): Promise<AuthSnapshot> {
  const [settings, security, profile] = await Promise.all([
    getSettings(),
    getSecurityRecord(),
    getUserProfile(),
  ]);

  return {
    settings,
    profile,
    hasPin: Boolean(security),
    biometricEnabled: security?.biometricEnabled ?? false,
  };
}

/**
 * Verifies a PIN, enforcing lockouts recorded in SQLite. The failed-attempt
 * counter and lockout are checked before hashing so the UI cannot bypass them.
 */
export async function verifyPinAttempt(
  pin: string,
  now: Date = new Date(),
): Promise<PinVerificationResult> {
  const record = await getSecurityRecord();
  if (!record) return { ok: false, reason: "no-pin" };

  const remainingMs = getRemainingLockMs(record.lockedUntil, now.getTime());
  if (remainingMs > 0 && record.lockedUntil) {
    return {
      ok: false,
      reason: "locked",
      lockedUntil: record.lockedUntil,
      remainingMs,
    };
  }

  const matches = await verifyPinHash(pin, record.credential);
  if (matches) {
    await clearFailedAttempts();
    return { ok: true };
  }

  const { failedAttempts, lockedUntil } = await registerFailedAttempt(now);
  if (lockedUntil) {
    return {
      ok: false,
      reason: "locked",
      lockedUntil,
      remainingMs: getRemainingLockMs(lockedUntil, now.getTime()),
    };
  }

  return {
    ok: false,
    reason: "incorrect",
    attemptsRemaining: getAttemptsRemaining(failedAttempts),
  };
}
