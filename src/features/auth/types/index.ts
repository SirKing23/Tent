export type PinAlgorithm = "PBKDF2-SHA256";

export type PinCredential = {
  /** Hex-encoded PBKDF2 output. The plaintext PIN is never persisted. */
  hash: string;
  /** Hex-encoded random salt, unique per PIN. */
  salt: string;
  algorithm: PinAlgorithm;
  iterations: number;
  /** Digits the PIN had when it was saved. */
  length: number;
};

export type SecurityRecord = {
  credential: PinCredential;
  biometricEnabled: boolean;
  failedAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthStatus =
  | "initializing"
  | "onboarding"
  | "locked"
  | "authenticated";

export type PinVerificationResult =
  | { ok: true }
  | { ok: false; reason: "no-pin" }
  | { ok: false; reason: "locked"; lockedUntil: string; remainingMs: number }
  | { ok: false; reason: "incorrect"; attemptsRemaining: number };

export type BiometricCapability = {
  available: boolean;
  enrolled: boolean;
  /** "Face ID", "Fingerprint", or a generic label for prompts. */
  label: string;
  types: number[];
  /** Why biometrics cannot be offered, when `available` is false. */
  unavailableReason?: string;
};

export type BiometricResult =
  | { ok: true }
  | { ok: false; reason: "cancelled" | "failed" | "unavailable" | "lockout" };
