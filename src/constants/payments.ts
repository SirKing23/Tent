export const PAYMENT_MODES = [
  "Cash",
  "GCash",
  "Maya",
  "Bank transfer",
  "Other",
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];
