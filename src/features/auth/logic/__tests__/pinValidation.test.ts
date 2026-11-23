import {
  getPinSetupError,
  isValidPin,
  PIN_LENGTH,
  sanitizePinInput,
} from "../pinValidation";

describe("pinValidation", () => {
  it("only accepts exactly six digits", () => {
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("12345a")).toBe(false);
    expect(isValidPin("")).toBe(false);
    expect(PIN_LENGTH).toBe(6);
  });

  it("strips non-digits and extra characters", () => {
    expect(sanitizePinInput("1a2b3c")).toBe("123");
    expect(sanitizePinInput("1234567890")).toBe("123456");
  });

  it("reports length and mismatch errors for setup", () => {
    expect(getPinSetupError("123456", "123456")).toBeNull();
    expect(getPinSetupError("12345", "12345")).toBe("length");
    expect(getPinSetupError("123456", "654321")).toBe("mismatch");
  });
});
