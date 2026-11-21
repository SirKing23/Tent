const pesoFormat: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/** `1234.5` → `1,234.50` */
const formatAmount = (amount: number): string =>
  amount.toLocaleString("en-PH", pesoFormat);

/** `1234.5` → `₱1,234.50` */
export const formatPeso = (amount: number): string => `₱${formatAmount(amount)}`;

/** `148500` → `₱148,500` — dashboard-style totals without centavos. */
export const formatPesoWhole = (amount: number): string =>
  `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

/** `-1234.5` → `₱1,234.50` */
export const formatPesoAbsolute = (amount: number): string =>
  formatPeso(Math.abs(amount));

/** `-1234.5` → `−₱1,234.50`, `1234.5` → `₱1,234.50` */
export const formatPesoWithSign = (amount: number): string =>
  `${amount < 0 ? "−" : ""}${formatPesoAbsolute(amount)}`;
