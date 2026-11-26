import type { SQLiteDatabase } from "expo-sqlite";

import { saveSecurityCredential } from "../../auth/services/securityRepository";
import type { PinCredential } from "../../auth/types";
import {
  DEFAULT_CURRENCY_CODE,
  DEFAULT_CURRENCY_SYMBOL,
} from "../../profile/types";
import { upsertUserProfile } from "../../profile/services/userProfileRepository";
import { setSettings } from "../../settings/services/settingsRepository";
import { getDatabase } from "../../../services/database";
import { validateProfileInput } from "../logic/profileValidation";
import { PRIVACY_NOTICE_VERSION } from "../types";

export type OnboardingSubmission = {
  fullName: string;
  email: string;
  pinCredential: PinCredential;
  biometricEnabled: boolean;
  privacyAcceptedAt: string;
};

const assertValidSubmission = (submission: OnboardingSubmission): void => {
  const validation = validateProfileInput(submission);
  if (!validation.valid) {
    throw new Error("Your name or email address is not valid.");
  }
  if (!submission.pinCredential?.hash || !submission.pinCredential.salt) {
    throw new Error("A six-digit PIN is required to finish setup.");
  }
  if (!submission.privacyAcceptedAt) {
    throw new Error("Accept the privacy notice to finish setup.");
  }
};

/**
 * Writes the profile, PIN credential, and settings in a single transaction.
 * `onboarding_completed` is written last, so an interrupted or failed save
 * leaves the app in the onboarding flow instead of a half-configured state.
 */
export async function saveOnboardingData(
  submission: OnboardingSubmission,
): Promise<void> {
  assertValidSubmission(submission);

  const { values } = validateProfileInput(submission);
  const db: SQLiteDatabase = await getDatabase();

  await db.withTransactionAsync(async () => {
    await upsertUserProfile(
      {
        ...values,
        currencyCode: DEFAULT_CURRENCY_CODE,
        currencySymbol: DEFAULT_CURRENCY_SYMBOL,
        photo: "",
      },
      db,
    );

    await saveSecurityCredential(
      {
        credential: submission.pinCredential,
        biometricEnabled: submission.biometricEnabled,
      },
      db,
    );

    await setSettings(
      {
        privacy_notice_version: PRIVACY_NOTICE_VERSION,
        privacy_accepted_at: submission.privacyAcceptedAt,
        app_lock_enabled: "true",
        onboarding_completed: "true",
      },
      db,
    );
  });
}
