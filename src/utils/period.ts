/** `new Date(2026, 10, 5)` → `2026-11` */
export const getCurrentPeriod = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Moves a `YYYY-MM` period by a number of months. */
export const shiftPeriod = (period: string, months: number): string => {
  const [year, month] = period.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return period;
  return getCurrentPeriod(new Date(year, month - 1 + months, 1));
};

/** `2026-11` → `November 2026` */
export const formatPeriodLabel = (period: string): string => {
  const [year, month] = period.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return period;
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};
