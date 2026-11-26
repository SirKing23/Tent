export const DEFAULT_CURRENCY_CODE = "PHP";
export const DEFAULT_CURRENCY_SYMBOL = "₱";

export type UserProfile = {
  fullName: string;
  email: string;
  currencyCode: string;
  currencySymbol: string;
  /** App-private photo path, or `""` when the avatar falls back to initials. */
  photo: string;
};

export const EMPTY_USER_PROFILE: UserProfile = {
  fullName: "",
  email: "",
  currencyCode: DEFAULT_CURRENCY_CODE,
  currencySymbol: DEFAULT_CURRENCY_SYMBOL,
  photo: "",
};
