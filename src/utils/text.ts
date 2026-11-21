/** Truncates a description to five words for list previews. */
export const getDescriptionPreview = (description: string): string => {
  const words = description.trim().split(/\s+/).filter(Boolean);
  return words.length > 5 ? `${words.slice(0, 5).join(" ")}…` : words.join(" ");
};

/** `("Ana", "Cruz")` → `AC` */
export const getInitials = (first: string, last: string): string =>
  `${first[0] ?? ""}${last[0] ?? ""}`;

/** `pluralize(1, "Bill")` → `1 Bill`, `pluralize(3, "Bill")` → `3 Bills` */
export const pluralize = (
  count: number,
  singular: string,
  plural = `${singular}s`,
): string => `${count} ${count === 1 ? singular : plural}`;
