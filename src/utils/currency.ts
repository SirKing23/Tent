export type CurrencyConfig = {
  /** ISO 4217 code, for example `PHP`. */
  code: string;
  name: string;
  symbol: string;
  locale: string;
};

export const DEFAULT_CURRENCY: CurrencyConfig = {
  code: "PHP",
  name: "Philippine Peso",
  symbol: "₱",
  locale: "en-PH",
};

/** Currencies the app can format without downloading a currency list. */
const KNOWN_CURRENCIES: Record<string, CurrencyConfig> = {
  PHP: DEFAULT_CURRENCY,
  USD: { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  EUR: { code: "EUR", name: "Euro", symbol: "€", locale: "en-IE" },
  GBP: { code: "GBP", name: "British Pound", symbol: "£", locale: "en-GB" },
  SGD: { code: "SGD", name: "Singapore Dollar", symbol: "S$", locale: "en-SG" },
  JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥", locale: "ja-JP" },
};

let activeCurrency: CurrencyConfig = DEFAULT_CURRENCY;

/**
 * Switches the symbol/locale used by every formatter. Call this after the
 * local profile loads so amounts follow the profile's ISO currency code.
 */
export const configureCurrency = (code: string, symbol?: string): void => {
  const normalized = code.trim().toUpperCase();
  activeCurrency =
    KNOWN_CURRENCIES[normalized] ??
    (normalized
      ? {
          code: normalized,
          name: normalized,
          symbol: symbol?.trim() || normalized,
          locale: DEFAULT_CURRENCY.locale,
        }
      : DEFAULT_CURRENCY);
};

export const getActiveCurrency = (): CurrencyConfig => activeCurrency;

const TWO_DECIMALS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

const formatNumber = (
  amount: number,
  options: Intl.NumberFormatOptions,
): string => amount.toLocaleString(activeCurrency.locale, options);

/** `1234.5` → `₱1,234.50` */
export const formatCurrency = (amount: number): string =>
  `${activeCurrency.symbol}${formatNumber(amount, TWO_DECIMALS)}`;

/** `148500` → `₱148,500` — dashboard-style totals without centavos. */
export const formatCurrencyWhole = (amount: number): string =>
  `${activeCurrency.symbol}${formatNumber(amount, { maximumFractionDigits: 0 })}`;

/** `-1234.5` → `₱1,234.50` */
export const formatCurrencyAbsolute = (amount: number): string =>
  formatCurrency(Math.abs(amount));

/** `-1234.5` → `−₱1,234.50`, `1234.5` → `₱1,234.50` */
export const formatCurrencyWithSign = (amount: number): string =>
  `${amount < 0 ? "−" : ""}${formatCurrencyAbsolute(amount)}`;
