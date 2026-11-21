/** `new Date(2026, 10, 5)` → `11/05/2026` */
export const formatDateMDY = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
};

/** `new Date(2026, 10, 21)` → `Saturday, November 21` */
export const formatDateLong = (date: Date): string =>
  date.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

/** ISO timestamp → `Nov 5`; invalid dates render as an empty string. */
export const formatDateShort = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
};
