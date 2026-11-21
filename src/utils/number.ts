/**
 * Parses a user-entered decimal, tolerating thousands separators.
 * Returns `null` for blank or invalid input so callers can distinguish
 * "nothing entered" from "invalid number".
 */
export const parseDecimal = (value: string): number | null => {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Parses a decimal the way the billing form always has (`parseFloat`), which
 * accepts a numeric prefix such as `1500ms`.
 */
export const parseFloatValue = (value: string): number | null => {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Parses a required amount, falling back to `0` for blank or invalid input. */
export const parseAmount = (value: string): number => parseDecimal(value) ?? 0;

/** Parses an integer and returns it only when it falls within `[min, max]`. */
export const parseIntegerInRange = (
  value: string,
  min: number,
  max: number,
): number | null => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
};
