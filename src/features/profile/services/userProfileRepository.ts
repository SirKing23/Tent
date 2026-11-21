import { getDatabase } from "../../../services/database";
import { EMPTY_USER_PROFILE, type UserProfile } from "../types";

/** Single meta row so profile settings travel with the app database. */
const PROFILE_KEY = "user.profile";

const parseProfile = (value: string | null | undefined): UserProfile => {
  if (!value) return EMPTY_USER_PROFILE;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return EMPTY_USER_PROFILE;

    const record = parsed as Record<string, unknown>;
    return {
      fullName: typeof record.fullName === "string" ? record.fullName : "",
      email: typeof record.email === "string" ? record.email : "",
    };
  } catch {
    return EMPTY_USER_PROFILE;
  }
};

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM meta WHERE key = ?",
      PROFILE_KEY,
    );
    return parseProfile(row?.value);
  } catch (error) {
    console.error("Unable to load user profile:", error);
    return EMPTY_USER_PROFILE;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    PROFILE_KEY,
    JSON.stringify({
      fullName: profile.fullName.trim(),
      email: profile.email.trim(),
    }),
  );
}
