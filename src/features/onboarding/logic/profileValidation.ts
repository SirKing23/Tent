import {
  normalizeEmail,
  normalizeFullName,
} from "../../profile/logic/profile";

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 80;
export const EMAIL_MAX_LENGTH = 254;

/** Deliberately permissive: local-only, no verification email is sent. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export type ProfileFieldErrors = {
  fullName?: string;
  email?: string;
};

export type ProfileValidation = {
  valid: boolean;
  values: { fullName: string; email: string };
  errors: ProfileFieldErrors;
};

export const validateFullName = (raw: string): string | undefined => {
  const value = normalizeFullName(raw);
  if (!value) return "Enter your full name.";
  if (CONTROL_CHARACTERS.test(raw)) return "Remove unsupported characters.";
  if (value.length < NAME_MIN_LENGTH) return "Enter at least 2 characters.";
  if (value.length > NAME_MAX_LENGTH)
    return `Keep your name under ${NAME_MAX_LENGTH} characters.`;
  return undefined;
};

export const validateEmail = (raw: string): string | undefined => {
  const value = normalizeEmail(raw);
  if (!value) return "Enter your email address.";
  if (value.length > EMAIL_MAX_LENGTH) return "Use a shorter email address.";
  if (!EMAIL_PATTERN.test(value))
    return "Enter a valid email address, such as you@example.com.";
  return undefined;
};

export const validateProfileInput = (input: {
  fullName: string;
  email: string;
}): ProfileValidation => {
  const errors: ProfileFieldErrors = {
    fullName: validateFullName(input.fullName),
    email: validateEmail(input.email),
  };

  return {
    valid: !errors.fullName && !errors.email,
    values: {
      fullName: normalizeFullName(input.fullName),
      email: normalizeEmail(input.email),
    },
    errors,
  };
};
