import {
  normalizeEmail,
  normalizeFullName,
} from "../../../profile/logic/profile";
import {
  validateEmail,
  validateFullName,
  validateProfileInput,
} from "../profileValidation";

describe("profileValidation", () => {
  it("normalizes whitespace and email casing", () => {
    expect(normalizeFullName("  Juan   Dela Cruz ")).toBe("Juan Dela Cruz");
    expect(normalizeEmail(" Me@Example.COM ")).toBe("me@example.com");
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(validateFullName("")).toBeTruthy();
    expect(validateFullName("   ")).toBeTruthy();
    expect(validateFullName("A")).toBeTruthy();
    expect(validateFullName("Ana")).toBeUndefined();
  });

  it("rejects an invalid email address", () => {
    expect(validateEmail("")).toBeTruthy();
    expect(validateEmail("ana@")).toBeTruthy();
    expect(validateEmail("ana.example.com")).toBeTruthy();
    expect(validateEmail("ana@example.com")).toBeUndefined();
  });

  it("returns normalized values when the profile is valid", () => {
    const result = validateProfileInput({
      fullName: "  Ana   Reyes ",
      email: " ANA@Example.com ",
    });

    expect(result.valid).toBe(true);
    expect(result.values).toEqual({
      fullName: "Ana Reyes",
      email: "ana@example.com",
    });
  });

  it("reports both field errors at once", () => {
    const result = validateProfileInput({ fullName: "", email: "nope" });

    expect(result.valid).toBe(false);
    expect(result.errors.fullName).toBeTruthy();
    expect(result.errors.email).toBeTruthy();
  });
});
