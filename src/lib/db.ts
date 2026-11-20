import * as SQLite from "expo-sqlite";

import { importLegacyAsyncStorageData } from "./legacyStorageMigration";

/** File name of the SQLite database stored in the app's documents directory. */
export const DATABASE_NAME = "myapptemplate.db";

/** Bump this when a new migration step is appended to `runMigrations`. */
const DATABASE_VERSION = 4;

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
