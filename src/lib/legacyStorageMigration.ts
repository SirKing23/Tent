import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SQLiteDatabase } from "expo-sqlite";

/**
 * One-time importer that copies data written by the previous AsyncStorage
 * implementation into SQLite.
 *
 * This module intentionally does not import the repository modules (they import
 * `db.ts`, which imports this file) so the migration can run against the raw
 * database connection while it is still being initialised.
 */

const LEGACY_IMPORT_FLAG = "legacy_async_storage_import";

const LEGACY_KEYS = {
  billingItems: "@billing_items",
  cashbooks: "@cashbooks",
  cashbookEntries: "@cashbook_entries",
  tenants: "@tenants",
} as const;

type LegacyRecord = Record<string, unknown>;

const readLegacyArray = async (key: string): Promise<LegacyRecord[]> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item): item is LegacyRecord => !!item && typeof item === "object",
  );
};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asNullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const upsertBillingItem = async (db: SQLiteDatabase, item: LegacyRecord) => {
  const id = asString(item.id);
  if (!id) return false;

  await db.runAsync(
    `INSERT INTO billing_items (
      id, name, utility_type, billing_type, display_unit, default_amount,
      due_date_type, fixed_due_date, recurring_rule, recurring_day, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      utility_type = excluded.utility_type,
      billing_type = excluded.billing_type,
      display_unit = excluded.display_unit,
      default_amount = excluded.default_amount,
      due_date_type = excluded.due_date_type,
      fixed_due_date = excluded.fixed_due_date,
      recurring_rule = excluded.recurring_rule,
      recurring_day = excluded.recurring_day,
      created_at = excluded.created_at`,
    id,
    asString(item.name, "Untitled"),
    asString(item.utilityType, "Other bills"),
    asString(item.billingType),
    asString(item.displayUnit),
    asNullableNumber(item.defaultAmount),
    asString(item.dueDateType),
    asNullableString(item.fixedDueDate),
    asNullableString(item.recurringRule),
    asNullableNumber(item.recurringDay),
    asString(item.createdAt, new Date().toISOString()),
  );
  return true;
};

const upsertCashbook = async (db: SQLiteDatabase, item: LegacyRecord) => {
  const id = asString(item.id);
  if (!id) return false;

  await db.runAsync(
    `INSERT INTO cashbooks (
      id, title, description, initial_cash_in, initial_cash_out, date,
      auto_create_monthly, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      initial_cash_in = excluded.initial_cash_in,
      initial_cash_out = excluded.initial_cash_out,
      date = excluded.date,
      auto_create_monthly = excluded.auto_create_monthly,
      created_at = excluded.created_at`,
    id,
    asString(item.title),
    asString(item.description),
    asNumber(item.initialCashIn),
    asNumber(item.initialCashOut),
    asNullableString(item.date),
    item.autoCreateMonthly ? 1 : 0,
    asNullableString(item.createdAt),
  );
  return true;
};

const upsertCashbookEntry = async (db: SQLiteDatabase, item: LegacyRecord) => {
  const id = asString(item.id);
  if (!id) return false;

  await db.runAsync(
    `INSERT INTO cashbook_entries (
      id, cashbook_id, type, amount, payment_mode, description, date,
      image_uri, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      cashbook_id = excluded.cashbook_id,
      type = excluded.type,
      amount = excluded.amount,
      payment_mode = excluded.payment_mode,
      description = excluded.description,
      date = excluded.date,
      image_uri = excluded.image_uri,
      created_at = excluded.created_at`,
    id,
    asString(item.cashbookId),
    item.type === "cashOut" ? "cashOut" : "cashIn",
    asNumber(item.amount),
    asString(item.paymentMode),
    asString(item.description),
    asString(item.date, new Date().toISOString()),
    asNullableString(item.imageUri),
    asNullableString(item.createdAt),
  );
  return true;
};

const upsertTenant = async (db: SQLiteDatabase, item: LegacyRecord) => {
  const id = asString(item.id);
  if (!id) return false;

  await db.runAsync(
    `INSERT INTO tenants (
      id, tenant_status, photo, first_name, middle_name, last_name, phone,
      email, id_type, id_number, id_photo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      tenant_status = excluded.tenant_status,
      photo = excluded.photo,
      first_name = excluded.first_name,
      middle_name = excluded.middle_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      email = excluded.email,
      id_type = excluded.id_type,
      id_number = excluded.id_number,
      id_photo = excluded.id_photo`,
    id,
    asString(item.tenantStatus, "Active"),
    asNullableString(item.photo),
    asString(item.firstName),
    asString(item.middleName),
    asString(item.lastName),
    asString(item.phone),
    asString(item.email),
    asString(item.idType),
    asString(item.idNumber),
    asNullableString(item.idPhoto),
  );
  return true;
};

/**
 * Copies every record stored under the old AsyncStorage keys into SQLite and
 * then clears them. Runs at most once per install (tracked in the `meta` table),
 * and every insert is an upsert so an interrupted run is safe to retry.
 */
export async function importLegacyAsyncStorageData(
  db: SQLiteDatabase,
): Promise<void> {
  try {
    const flag = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM meta WHERE key = ?",
      LEGACY_IMPORT_FLAG,
    );
    if (flag?.value === "done") return;

    const [billingItems, cashbooks, cashbookEntries, tenants] =
      await Promise.all([
        readLegacyArray(LEGACY_KEYS.billingItems),
        readLegacyArray(LEGACY_KEYS.cashbooks),
        readLegacyArray(LEGACY_KEYS.cashbookEntries),
        readLegacyArray(LEGACY_KEYS.tenants),
      ]);

    let imported = 0;

    for (const item of billingItems) {
      if (await upsertBillingItem(db, item)) imported += 1;
    }
    for (const item of cashbooks) {
      if (await upsertCashbook(db, item)) imported += 1;
    }
    for (const item of cashbookEntries) {
      if (await upsertCashbookEntry(db, item)) imported += 1;
    }
    for (const item of tenants) {
      if (await upsertTenant(db, item)) imported += 1;
    }

    await db.runAsync(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      LEGACY_IMPORT_FLAG,
      "done",
    );

    if (imported > 0) {
      await AsyncStorage.multiRemove(Object.values(LEGACY_KEYS));
      console.log(
        `Migrated ${imported} AsyncStorage record(s) into the SQLite database.`,
      );
    }
  } catch (error) {
    // Never block startup on a failed legacy import.
    console.error("Unable to migrate legacy AsyncStorage data:", error);
  }
}
