import type { PinCredential } from "../auth/types";

export type OnboardingDraft = {
  fullName: string;
  email: string;
  /** Only the derived hash/salt is kept in memory, never the plaintext PIN. */
  pinCredential: PinCredential | null;
  biometricEnabled: boolean;
  privacyAcceptedAt: string | null;
};

export const EMPTY_ONBOARDING_DRAFT: OnboardingDraft = {
  fullName: "",
  email: "",
  pinCredential: null,
  biometricEnabled: false,
  privacyAcceptedAt: null,
};

export const PRIVACY_NOTICE_VERSION = "1.0";

export const ONBOARDING_STEP_COUNT = 4;
