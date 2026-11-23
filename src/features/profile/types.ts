export const DEFAULT_CURRENCY_CODE = "PHP";
export const DEFAULT_CURRENCY_SYMBOL = "₱";

export type UserProfile = {
  fullName: string;
  email: string;
  currencyCode: string;
  currencySymbol: string;
};

export const EMPTY_USER_PROFILE: UserProfile = {
  fullName: "",
  email: "",
  currencyCode: DEFAULT_CURRENCY_CODE,
  currencySymbol: DEFAULT_CURRENCY_SYMBOL,
};
