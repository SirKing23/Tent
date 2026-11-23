import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import { getDatabase } from "./database";
import { deleteAllStoredPhotos } from "./photoStorage";

/**
 * Every table that holds user data. The schema itself is kept so the next
 * launch runs straight into onboarding against the same database.
 */
export const RESETTABLE_TABLES = [
  "cashbook_entries",
  "cashbooks",
  "monthly_bill_entries",
  "monthly_bill_items",
  "properties",
  "tenants",
  "billing_items",
  "reminders",
  "user_profile",
  "app_security",
  "app_settings",
  "meta",
] as const;

/**
 * Permanently removes the local account: SQLite rows, app-private photos,
 * scheduled reminder alerts, and the legacy AsyncStorage payload.
 *
 * Invoice images that were explicitly saved to the device gallery are outside
 * the app sandbox and are not touched.
 */
export async function resetApplicationData(): Promise<void> {
  const db = await getDatabase();

  // Overwrite freed pages so the old rows are not left in the database file.
  await db.execAsync("PRAGMA secure_delete = ON;");

  try {
    await db.withTransactionAsync(async () => {
      for (const table of RESETTABLE_TABLES) {
        await db.runAsync(`DELETE FROM ${table}`);
      }
    });
  } finally {
    // `VACUUM` must run outside a transaction; it rewrites the file without
    // the freelist pages and releases the space back to the OS.
    try {
      await db.execAsync("VACUUM;");
      // Drop WAL frames that still point at the pre-reset pages.
      await db.execAsync("PRAGMA wal_checkpoint(TRUNCATE);");
    } catch (error) {
      console.warn("Unable to compact the database after reset:", error);
    }
  }

  deleteAllStoredPhotos();

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn("Unable to cancel scheduled reminders:", error);
  }

  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.warn("Unable to clear legacy storage:", error);
  }
}
