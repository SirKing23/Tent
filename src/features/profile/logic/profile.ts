/** `"Juan Dela Cruz"` → `"Juan"`; blank names fall back to `"Landlord"`. */
export const getProfileFirstName = (fullName: string): string => {
  const first = fullName.trim().split(/\s+/)[0];
  return first || "Landlord";
};

/** `"Juan Dela Cruz"` → `"JD"`; blank names fall back to the app initial. */
export const getProfileInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};
