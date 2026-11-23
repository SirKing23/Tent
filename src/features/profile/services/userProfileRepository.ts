import type { SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "../../../services/database";
import { normalizeEmail, normalizeFullName } from "../logic/profile";
import {
  DEFAULT_CURRENCY_CODE,
  DEFAULT_CURRENCY_SYMBOL,
  EMPTY_USER_PROFILE,
  type UserProfile,
} from "../types";

/** Single local profile row; onboarding upserts the same row on retry. */
const PROFILE_ID = "local";

type ProfileRow = {
  full_name: string;
  email: string;
  currency_code: string;
  currency_symbol: string;
};

const resolveDb = async (db?: SQLiteDatabase): Promise<SQLiteDatabase> =>
  db ?? getDatabase();

const mapRow = (row: ProfileRow): UserProfile => ({
  fullName: row.full_name,
  email: row.email,
  currencyCode: row.currency_code || DEFAULT_CURRENCY_CODE,
  currencySymbol: row.currency_symbol || DEFAULT_CURRENCY_SYMBOL,
});

export async function getUserProfile(
  db?: SQLiteDatabase,
): Promise<UserProfile> {
  try {
    const database = await resolveDb(db);
    const row = await database.getFirstAsync<ProfileRow>(
      "SELECT full_name, email, currency_code, currency_symbol FROM user_profile WHERE id = ? AND deleted_at IS NULL",
      PROFILE_ID,
    );
    return row ? mapRow(row) : EMPTY_USER_PROFILE;
  } catch (error) {
    console.error("Unable to load user profile:", error);
    return EMPTY_USER_PROFILE;
  }
}

export async function upsertUserProfile(
  profile: UserProfile,
  db?: SQLiteDatabase,
): Promise<void> {
  const database = await resolveDb(db);
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO user_profile (
      id, full_name, email, currency_code, currency_symbol, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      full_name = excluded.full_name,
      email = excluded.email,
      currency_code = excluded.currency_code,
      currency_symbol = excluded.currency_symbol,
      updated_at = excluded.updated_at,
      deleted_at = NULL`,
    PROFILE_ID,
    normalizeFullName(profile.fullName),
    normalizeEmail(profile.email),
    profile.currencyCode || DEFAULT_CURRENCY_CODE,
    profile.currencySymbol || DEFAULT_CURRENCY_SYMBOL,
    now,
    now,
  );
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await upsertUserProfile(profile);
}
