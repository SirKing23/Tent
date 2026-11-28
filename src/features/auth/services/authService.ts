import { getUserProfile } from "../../profile/services/userProfileRepository";
import type { UserProfile } from "../../profile/types";
import { getSettings } from "../../settings/services/settingsRepository";
import type { AppSettings } from "../../settings/types";
import { PIN_LENGTH } from "../logic/pinValidation";
import {
  getRemainingLockMs,
  getAttemptsRemaining,
} from "../logic/pinPolicy";
import type { PinCredential, PinVerificationResult } from "../types";
import {
  clearFailedAttempts,
  getSecurityRecord,
  registerFailedAttempt,
  updatePinCredential,
} from "./securityRepository";
import {
  createPinCredential,
  PIN_ITERATIONS,
  verifyPin as verifyPinHash,
} from "./pinService";

export type AuthSnapshot = {
  settings: AppSettings;
  profile: UserProfile;
  hasPin: boolean;
  biometricEnabled: boolean;
  /** Digits the stored PIN expects; six for accounts created by older builds. */
  pinLength: number;
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
    pinLength: security?.credential.length ?? PIN_LENGTH,
  };
}

/**
 * Re-derives the hash at the current work factor after a successful unlock, so
 * accounts created with the old (slow) cost are upgraded without asking the
 * user to change their PIN. A failure only leaves the old credential in place.
 */
const refreshCredentialCost = async (
  pin: string,
  credential: PinCredential,
): Promise<void> => {
  if (credential.iterations === PIN_ITERATIONS) return;
  try {
    // The salt is regenerated with the hash; the PIN itself is unchanged.
    await updatePinCredential(await createPinCredential(pin));
  } catch (error) {
    console.warn("Unable to refresh the PIN work factor:", error);
  }
};

/**
 * Verifies a PIN, enforcing lockouts recorded in SQLite. The failed-attempt
 * counter and lockout are checked before hashing so the UI cannot bypass them.
 *
 * On success the stored hash is quietly re-derived at the current work factor.
 * Callers that are about to replace the credential themselves (changing the
 * PIN) pass `refreshCost: false` so the upgrade cannot overwrite their write.
 */
export async function verifyPinAttempt(
  pin: string,
  now: Date = new Date(),
  { refreshCost = true }: { refreshCost?: boolean } = {},
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
    if (refreshCost) {
      // Fire and forget: the unlock must not wait for a second hash.
      void refreshCredentialCost(pin, record.credential);
    }
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
