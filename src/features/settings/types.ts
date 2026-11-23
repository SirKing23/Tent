export type AppSettingKey =
  | "onboarding_completed"
  | "app_lock_enabled"
  | "privacy_notice_version"
  | "privacy_accepted_at";

export type AppSettings = {
  onboardingCompleted: boolean;
  appLockEnabled: boolean;
  privacyNoticeVersion: string | null;
  privacyAcceptedAt: string | null;
};

/**
 * `appLockEnabled` defaults to true so a database that is missing the setting
 * still protects an account that already has a PIN.
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  onboardingCompleted: false,
  appLockEnabled: true,
  privacyNoticeVersion: null,
  privacyAcceptedAt: null,
};
