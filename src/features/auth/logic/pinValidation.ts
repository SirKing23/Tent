export const PIN_LENGTH = 6;

const PIN_PATTERN = new RegExp(`^\\d{${PIN_LENGTH}}$`);

/** Exactly six numeric digits. */
export const isValidPin = (pin: string): boolean => PIN_PATTERN.test(pin);

/** Non-digits (and anything past the sixth digit) are discarded. */
export const sanitizePinInput = (value: string): string =>
  value.replace(/\D/g, "").slice(0, PIN_LENGTH);

export type PinSetupError = "length" | "mismatch";

export const getPinSetupError = (
  pin: string,
  confirmation: string,
): PinSetupError | null => {
  if (!isValidPin(pin)) return "length";
  if (pin !== confirmation) return "mismatch";
  return null;
};
