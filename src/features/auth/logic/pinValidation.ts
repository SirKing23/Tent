/**
 * Digits used by every PIN created from this version on.
 *
 * Earlier releases used six digits. Those hashes stay valid, so the lock
 * screen keeps asking for six until that user chooses a new PIN.
 */
export const PIN_LENGTH = 4;
export const LEGACY_PIN_LENGTH = 6;
export const MAX_PIN_LENGTH = LEGACY_PIN_LENGTH;
export const SUPPORTED_PIN_LENGTHS = [PIN_LENGTH, LEGACY_PIN_LENGTH] as const;

export const isValidPinLength = (length: number): boolean =>
  SUPPORTED_PIN_LENGTHS.some((supported) => supported === length);

/** Numeric PIN of `length` digits. */
export const isValidPin = (pin: string, length: number = PIN_LENGTH): boolean =>
  pin.length === length && /^\d+$/.test(pin);

/** Non-digits (and anything past the allowed length) are discarded. */
export const sanitizePinInput = (
  value: string,
  limit: number = MAX_PIN_LENGTH,
): string => value.replace(/\D/g, "").slice(0, limit);

export type PinSetupError = "length" | "mismatch";

export const getPinSetupError = (
  pin: string,
  confirmation: string,
): PinSetupError | null => {
  if (!isValidPin(pin)) return "length";
  if (pin !== confirmation) return "mismatch";
  return null;
};
