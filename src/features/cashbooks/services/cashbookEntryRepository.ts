import { buildPlaceholders, getDatabase } from "../../../services/database";
import { deleteStoredPhoto } from "../../../services/photoStorage";
import type { CashbookEntry, CashbookEntryType } from "../types";

type CashbookEntryRow = {
  id: string;
  cashbook_id: string;
  type: CashbookEntryType;
  amount: number;
  payment_mode: string;
  description: string;
  date: string;
  image_uri: string | null;
  created_at: string | null;
};

const mapCashbookEntryRow = (row: CashbookEntryRow): CashbookEntry => ({
  id: row.id,
  cashbookId: row.cashbook_id,
  type: row.type,
  amount: row.amount,
  paymentMode: row.payment_mode,
  description: row.description,
  date: row.date,
  imageUri: row.image_uri ?? undefined,
  createdAt: row.created_at ?? "",
});

export async function getCashbookEntries(): Promise<CashbookEntry[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CashbookEntryRow>(
      "SELECT * FROM cashbook_entries ORDER BY rowid DESC",
    );
    return rows.map(mapCashbookEntryRow);
  } catch (error) {
    console.error("Unable to load cash-book entries:", error);
    return [];
  }
}

export async function getEntriesForCashbook(
  cashbookId: string,
): Promise<CashbookEntry[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CashbookEntryRow>(
      `SELECT * FROM cashbook_entries
       WHERE cashbook_id = ?
       ORDER BY created_at DESC, rowid DESC`,
      cashbookId,
    );
    return rows.map(mapCashbookEntryRow);
  } catch (error) {
    console.error("Unable to load cash-book entries:", error);
    return [];
  }
}

export async function saveCashbookEntry(entry: CashbookEntry): Promise<void> {
  const db = await getDatabase();

  const previous = await db.getFirstAsync<{ image_uri: string | null }>(
    "SELECT image_uri FROM cashbook_entries WHERE id = ?",
    entry.id,
  );

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
    entry.id,
    entry.cashbookId,
    entry.type,
    entry.amount,
    entry.paymentMode,
    entry.description,
    entry.date,
    entry.imageUri ?? null,
    entry.createdAt,
  );

  // Remove the previous photo file when it was replaced or cleared.
  if (previous?.image_uri && previous.image_uri !== (entry.imageUri ?? null)) {
    deleteStoredPhoto(previous.image_uri);
  }
}

export async function deleteCashbookEntries(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ image_uri: string | null }>(
    `SELECT image_uri FROM cashbook_entries
     WHERE id IN (${buildPlaceholders(ids.length)})`,
    ids,
  );

  await db.runAsync(
    `DELETE FROM cashbook_entries WHERE id IN (${buildPlaceholders(ids.length)})`,
    ids,
  );

  for (const row of rows) deleteStoredPhoto(row.image_uri);
}
