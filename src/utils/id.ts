/** Timestamp id used by records that previously relied on `Date.now()`. */
export const createTimestampId = (): string => Date.now().toString();

/** Timestamp id with a slugged label, e.g. `1763680000000-internet-bill`. */
export const createSlugId = (label: string): string =>
  `${Date.now()}-${label.trim().toLowerCase().replace(/\s+/g, "-")}`;
