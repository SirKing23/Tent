/**
 * Result of validating user input. Failures carry the copy that screens show
 * in an `Alert`, so validation rules stay pure and presentation stays dumb.
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; title: string; message: string };
