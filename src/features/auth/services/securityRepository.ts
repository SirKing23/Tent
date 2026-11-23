import type { SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "../../../services/database";
import { getLockDurationMs } from "../logic/pinPolicy";
import type { PinAlgorithm, PinCredential, SecurityRecord } from "../types";

/** Single local account row; a fixed id keeps re-onboarding idempotent. */
const SECURITY_ID = "local";

type SecurityRow = {
  pin_hash: string;
  pin_salt: string;
  pin_algorithm: string;
  pin_iterations: number;
  biometric_enabled: number;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
};

const resolveDb = async (db?: SQLiteDatabase): Promise<SQLiteDatabase> =>
  db ?? getDatabase();

const mapRow = (row: SecurityRow): SecurityRecord => ({
  credential: {
    hash: row.pin_hash,
    salt: row.pin_salt,
    algorithm: (row.pin_algorithm as PinAlgorithm) || "PBKDF2-SHA256",
    iterations: row.pin_iterations,
  },
  biometricEnabled: row.biometric_enabled === 1,
  failedAttempts: row.failed_attempts,
  lockedUntil: row.locked_until,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function getSecurityRecord(
  db?: SQLiteDatabase,
): Promise<SecurityRecord | null> {
  try {
    const database = await resolveDb(db);
    const row = await database.getFirstAsync<SecurityRow>(
      "SELECT * FROM app_security WHERE id = ?",
      SECURITY_ID,
    );
    return row ? mapRow(row) : null;
  } catch (error) {
    console.error("Unable to load security settings:", error);
    return null;
  }
}

export async function saveSecurityCredential(
  input: { credential: PinCredential; biometricEnabled: boolean },
  db?: SQLiteDatabase,
): Promise<void> {
  const database = await resolveDb(db);
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO app_security (
      id, pin_hash, pin_salt, pin_algorithm, pin_iterations,
      biometric_enabled, failed_attempts, locked_until, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      pin_hash = excluded.pin_hash,
      pin_salt = excluded.pin_salt,
      pin_algorithm = excluded.pin_algorithm,
      pin_iterations = excluded.pin_iterations,
      biometric_enabled = excluded.biometric_enabled,
      failed_attempts = 0,
      locked_until = NULL,
      updated_at = excluded.updated_at`,
    SECURITY_ID,
    input.credential.hash,
    input.credential.salt,
    input.credential.algorithm,
    input.credential.iterations,
    input.biometricEnabled ? 1 : 0,
    now,
    now,
  );
}

export async function updateBiometricEnabled(
  enabled: boolean,
  db?: SQLiteDatabase,
): Promise<void> {
  const database = await resolveDb(db);
  await database.runAsync(
    "UPDATE app_security SET biometric_enabled = ?, updated_at = ? WHERE id = ?",
    enabled ? 1 : 0,
    new Date().toISOString(),
    SECURITY_ID,
  );
}

/**
 * Increments the failure counter and, past the threshold, records the next
 * `locked_until`. Returns the persisted counters so the caller can explain the
 * remaining attempts or the lockout duration.
 */
export async function registerFailedAttempt(
  now: Date = new Date(),
  db?: SQLiteDatabase,
): Promise<{ failedAttempts: number; lockedUntil: string | null }> {
  const database = await resolveDb(db);
  const current = await getSecurityRecord(database);
  const failedAttempts = (current?.failedAttempts ?? 0) + 1;
  const lockMs = getLockDurationMs(failedAttempts);
  const lockedUntil =
    lockMs > 0 ? new Date(now.getTime() + lockMs).toISOString() : null;

  await database.runAsync(
    `UPDATE app_security
     SET failed_attempts = ?, locked_until = ?, updated_at = ?
     WHERE id = ?`,
    failedAttempts,
    lockedUntil,
    new Date().toISOString(),
    SECURITY_ID,
  );

  return { failedAttempts, lockedUntil };
}

export async function clearFailedAttempts(
  db?: SQLiteDatabase,
): Promise<void> {
  const database = await resolveDb(db);
  await database.runAsync(
    `UPDATE app_security
     SET failed_attempts = 0, locked_until = NULL, updated_at = ?
     WHERE id = ? AND (failed_attempts > 0 OR locked_until IS NOT NULL)`,
    new Date().toISOString(),
    SECURITY_ID,
  );
}
