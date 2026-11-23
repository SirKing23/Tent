import type { SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "../../../services/database";
import {
  DEFAULT_APP_SETTINGS,
  type AppSettingKey,
  type AppSettings,
} from "../types";

const resolveDb = async (db?: SQLiteDatabase): Promise<SQLiteDatabase> =>
  db ?? getDatabase();

const parseBoolean = (value: string | undefined): boolean =>
  value === "true" || value === "1";

export async function getSettings(db?: SQLiteDatabase): Promise<AppSettings> {
  try {
    const database = await resolveDb(db);
    const rows = await database.getAllAsync<{
      setting_key: string;
      setting_value: string;
    }>("SELECT setting_key, setting_value FROM app_settings");

    const values = new Map(
      rows.map((row) => [row.setting_key, row.setting_value]),
    );

    return {
      onboardingCompleted: parseBoolean(values.get("onboarding_completed")),
      appLockEnabled: values.has("app_lock_enabled")
        ? parseBoolean(values.get("app_lock_enabled"))
        : DEFAULT_APP_SETTINGS.appLockEnabled,
      privacyNoticeVersion: values.get("privacy_notice_version") ?? null,
      privacyAcceptedAt: values.get("privacy_accepted_at") ?? null,
    };
  } catch (error) {
    console.error("Unable to load app settings:", error);
    return DEFAULT_APP_SETTINGS;
  }
}

export async function setSettings(
  values: Partial<Record<AppSettingKey, string>>,
  db?: SQLiteDatabase,
): Promise<void> {
  const entries = Object.entries(values).filter(
    (entry): entry is [AppSettingKey, string] => typeof entry[1] === "string",
  );
  if (entries.length === 0) return;

  const database = await resolveDb(db);
  const now = new Date().toISOString();

  for (const [key, value] of entries) {
    await database.runAsync(
      `INSERT INTO app_settings (id, setting_key, setting_value, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value = excluded.setting_value,
         updated_at = excluded.updated_at`,
      key,
      key,
      value,
      now,
    );
  }
}

export async function setSetting(
  key: AppSettingKey,
  value: string,
  db?: SQLiteDatabase,
): Promise<void> {
  await setSettings({ [key]: value }, db);
}
