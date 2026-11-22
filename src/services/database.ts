import * as SQLite from "expo-sqlite";

import { importLegacyAsyncStorageData } from "./legacyStorageMigration";

/** File name of the SQLite database stored in the app's documents directory. */
export const DATABASE_NAME = "myapptemplate.db";

/** Bump this when a new migration step is appended to `runMigrations`. */
const DATABASE_VERSION = 11;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Applies schema updates one version at a time using `PRAGMA user_version`.
 * Every step must be idempotent so an interrupted upgrade can safely re-run.
 */
const runMigrations = async (db: SQLite.SQLiteDatabase) => {
  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS billing_items (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        utility_type TEXT NOT NULL DEFAULT 'Other bills',
        billing_type TEXT NOT NULL DEFAULT '',
        display_unit TEXT NOT NULL DEFAULT '',
        default_amount REAL,
        due_date_type TEXT NOT NULL DEFAULT '',
        fixed_due_date TEXT,
        recurring_rule TEXT,
        recurring_day INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cashbooks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        initial_cash_in REAL NOT NULL DEFAULT 0,
        initial_cash_out REAL NOT NULL DEFAULT 0,
        date TEXT,
        auto_create_monthly INTEGER NOT NULL DEFAULT 0,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS cashbook_entries (
        id TEXT PRIMARY KEY NOT NULL,
        cashbook_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'cashIn',
        amount REAL NOT NULL DEFAULT 0,
        payment_mode TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        image_uri TEXT,
        created_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_cashbook_entries_cashbook
        ON cashbook_entries (cashbook_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY NOT NULL,
        tenant_status TEXT NOT NULL DEFAULT 'Active',
        photo TEXT,
        first_name TEXT NOT NULL DEFAULT '',
        middle_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        id_type TEXT NOT NULL DEFAULT '',
        id_number TEXT NOT NULL DEFAULT '',
        id_photo TEXT
      );
    `);
  }

  if (currentVersion < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'Building',
        parent_building_id TEXT,
        street TEXT NOT NULL DEFAULT '',
        barangay TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        province TEXT NOT NULL DEFAULT '',
        zip_code TEXT NOT NULL DEFAULT '',
        country TEXT NOT NULL DEFAULT 'Philippines',
        bill_ids TEXT NOT NULL DEFAULT '[]',
        tenant_ids TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );
    `);
  }

  if (currentVersion < 3) {
    const propertyColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(properties)",
    );
    if (!propertyColumns.some((column) => column.name === "photos")) {
      await db.execAsync(
        "ALTER TABLE properties ADD COLUMN photos TEXT NOT NULL DEFAULT '[]'",
      );
    }
  }

  if (currentVersion < 4) {
    const propertyColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(properties)",
    );
    if (!propertyColumns.some((column) => column.name === "sub_meter_bill_ids")) {
      await db.execAsync(
        "ALTER TABLE properties ADD COLUMN sub_meter_bill_ids TEXT NOT NULL DEFAULT '[]'",
      );
    }
  }

  if (currentVersion < 5) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS monthly_bill_entries (
        id TEXT PRIMARY KEY NOT NULL,
        period TEXT NOT NULL,
        property_id TEXT NOT NULL,
        billing_item_id TEXT NOT NULL,
        reading REAL,
        amount REAL,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        UNIQUE(period, property_id, billing_item_id)
      );

      CREATE INDEX IF NOT EXISTS idx_monthly_bill_entries_period
        ON monthly_bill_entries (period, property_id);
    `);
  }

  if (currentVersion < 6) {
    const entryColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(monthly_bill_entries)",
    );
    if (!entryColumns.some((column) => column.name === "photo_uri")) {
      await db.execAsync(
        "ALTER TABLE monthly_bill_entries ADD COLUMN photo_uri TEXT",
      );
    }
  }

  if (currentVersion < 7) {
    const entryColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(monthly_bill_entries)",
    );
    if (!entryColumns.some((column) => column.name === "previous_reading")) {
      await db.execAsync(
        "ALTER TABLE monthly_bill_entries ADD COLUMN previous_reading REAL",
      );
    }
  }

  if (currentVersion < 8) {
    const propertyColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(properties)",
    );
    if (!propertyColumns.some((column) => column.name === "fixed_bill_shares")) {
      await db.execAsync(
        "ALTER TABLE properties ADD COLUMN fixed_bill_shares TEXT NOT NULL DEFAULT '{}'",
      );
    }
  }

  if (currentVersion < 9) {
    const entryColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(monthly_bill_entries)",
    );
    const addColumn = async (name: string, definition: string) => {
      if (!entryColumns.some((column) => column.name === name)) {
        await db.execAsync(
          `ALTER TABLE monthly_bill_entries ADD COLUMN ${name} ${definition}`,
        );
      }
    };
    await addColumn("paid_at", "TEXT");
    await addColumn("payment_mode", "TEXT");
    await addColumn("payment_description", "TEXT");
    await addColumn("payment_proof_uri", "TEXT");
  }

  if (currentVersion < 10) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS monthly_bill_items (
        id TEXT PRIMARY KEY NOT NULL,
        period TEXT NOT NULL,
        property_id TEXT NOT NULL,
        name TEXT NOT NULL,
        utility_type TEXT NOT NULL DEFAULT 'Other bills',
        billing_type TEXT NOT NULL DEFAULT '',
        display_unit TEXT NOT NULL DEFAULT '',
        default_amount REAL,
        due_date_type TEXT NOT NULL DEFAULT '',
        fixed_due_date TEXT,
        recurring_rule TEXT,
        recurring_day INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_monthly_bill_items_period_property
        ON monthly_bill_items (period, property_id);
    `);
  }

  if (currentVersion < 11) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        remind_at TEXT NOT NULL,
        repeat_rule TEXT NOT NULL DEFAULT 'none',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_reminders_remind_at
        ON reminders (remind_at);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
};

const openDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // WAL keeps reads fast and lets reads run while a write is in progress.
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  await runMigrations(db);

  // One-time copy of data that used to live in AsyncStorage.
  await importLegacyAsyncStorageData(db);

  return db;
};

/**
 * Returns the shared database connection, opening (and migrating) it on first
 * use. The promise is cached so concurrent callers share one connection.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabase().catch((error) => {
      // Allow a later call to retry if opening failed.
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

/** Warms up the connection early (for example, during app startup). */
export async function initDatabase(): Promise<void> {
  await getDatabase();
}

/** Builds `?, ?, ?` placeholder lists for `IN (...)` clauses. */
export const buildPlaceholders = (count: number): string =>
  Array.from({ length: count }, () => "?").join(", ");
