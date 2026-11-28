import {
  getPinSetupError,
  isValidPin,
  isValidPinLength,
  LEGACY_PIN_LENGTH,
  PIN_LENGTH,
  sanitizePinInput,
} from "../pinValidation";

describe("pinValidation", () => {
  it("creates four-digit PINs by default", () => {
    expect(PIN_LENGTH).toBe(4);
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("123a")).toBe(false);
    expect(isValidPin("")).toBe(false);
  });

  it("still accepts the six-digit PINs created by older builds", () => {
    expect(LEGACY_PIN_LENGTH).toBe(6);
    expect(isValidPin("123456", LEGACY_PIN_LENGTH)).toBe(true);
    expect(isValidPin("12345", LEGACY_PIN_LENGTH)).toBe(false);
    expect(isValidPinLength(4)).toBe(true);
    expect(isValidPinLength(6)).toBe(true);
    expect(isValidPinLength(5)).toBe(false);
  });

  it("strips non-digits and extra characters", () => {
    expect(sanitizePinInput("1a2b3c")).toBe("123");
    expect(sanitizePinInput("1234567890")).toBe("123456");
    expect(sanitizePinInput("1234567890", PIN_LENGTH)).toBe("1234");
  });

  it("reports length and mismatch errors for setup", () => {
    expect(getPinSetupError("1234", "1234")).toBeNull();
    expect(getPinSetupError("123", "123")).toBe("length");
    expect(getPinSetupError("123456", "123456")).toBe("length");
    expect(getPinSetupError("1234", "4321")).toBe("mismatch");
  });
});
