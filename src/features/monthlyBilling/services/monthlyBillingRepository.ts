import { getDatabase } from "../../../services/database";
import { deleteStoredPhoto } from "../../../services/photoStorage";
import type { PaymentMode } from "../../../constants/payments";
import { createTimestampId } from "../../../utils/id";
import type {
  MonthlyBillEntry,
  MonthlyBillEntryInput,
  MonthlyBillPaymentInput,
} from "../types";

type MonthlyBillEntryRow = {
  id: string;
  period: string;
  property_id: string;
  billing_item_id: string;
  reading: number | null;
  previous_reading: number | null;
  amount: number | null;
  photo_uri: string | null;
  paid_at: string | null;
  payment_mode: PaymentMode | null;
  payment_description: string | null;
  payment_proof_uri: string | null;
  note: string;
  created_at: string;
};

const mapRow = (row: MonthlyBillEntryRow): MonthlyBillEntry => ({
  id: row.id,
  period: row.period,
  propertyId: row.property_id,
  billingItemId: row.billing_item_id,
  reading: row.reading ?? undefined,
  previousReading: row.previous_reading ?? undefined,
  amount: row.amount ?? undefined,
  photoUri: row.photo_uri ?? undefined,
  paidAt: row.paid_at ?? undefined,
  paymentMode: row.payment_mode ?? undefined,
  paymentDescription: row.payment_description ?? undefined,
  paymentProofUri: row.payment_proof_uri ?? undefined,
  note: row.note,
  createdAt: row.created_at,
});

export async function getMonthlyBillEntries(
  period: string,
): Promise<MonthlyBillEntry[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<MonthlyBillEntryRow>(
      "SELECT * FROM monthly_bill_entries WHERE period = ? ORDER BY property_id",
      period,
    );
    return rows.map(mapRow);
  } catch (error) {
    console.error("Unable to load monthly bill entries:", error);
    return [];
  }
}

/**
 * Upserts the amount/reading for one property and bill in a period. The
 * original `created_at` is kept when the row already exists.
 */
export async function saveMonthlyBillEntry(
  input: MonthlyBillEntryInput,
): Promise<void> {
  const db = await getDatabase();
  const nextPhoto = input.photoUri ?? null;
  const previous = await db.getFirstAsync<{ photo_uri: string | null }>(
    `SELECT photo_uri FROM monthly_bill_entries
     WHERE period = ? AND property_id = ? AND billing_item_id = ?`,
    input.period,
    input.propertyId,
    input.billingItemId,
  );

  await db.runAsync(
    `INSERT INTO monthly_bill_entries (
      id, period, property_id, billing_item_id, reading, previous_reading,
      amount, photo_uri, note, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(period, property_id, billing_item_id) DO UPDATE SET
      reading = excluded.reading,
      previous_reading = excluded.previous_reading,
      amount = excluded.amount,
      photo_uri = excluded.photo_uri,
      note = excluded.note`,
    createTimestampId(),
    input.period,
    input.propertyId,
    input.billingItemId,
    input.reading ?? null,
    input.previousReading ?? null,
    input.amount ?? null,
    nextPhoto,
    input.note ?? "",
    new Date().toISOString(),
  );

  // Remove the old evidence file when it was replaced or cleared.
  if (previous?.photo_uri && previous.photo_uri !== nextPhoto) {
    deleteStoredPhoto(previous.photo_uri);
  }
}

/**
 * Saves payment details without touching the recorded reading/amount. Creates a
 * payment-only row when the bill had no amounts recorded for the period.
 */
export async function saveMonthlyBillPayment(
  input: MonthlyBillPaymentInput,
): Promise<void> {
  const db = await getDatabase();
  const nextProof = input.paymentProofUri ?? null;
  const previous = await db.getFirstAsync<{
    payment_proof_uri: string | null;
  }>(
    `SELECT payment_proof_uri FROM monthly_bill_entries
     WHERE period = ? AND property_id = ? AND billing_item_id = ?`,
    input.period,
    input.propertyId,
    input.billingItemId,
  );

  await db.runAsync(
    `INSERT INTO monthly_bill_entries (
      id, period, property_id, billing_item_id, reading, previous_reading,
      amount, photo_uri, paid_at, payment_mode, payment_description,
      payment_proof_uri, note, created_at
    ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, '', ?)
    ON CONFLICT(period, property_id, billing_item_id) DO UPDATE SET
      paid_at = excluded.paid_at,
      payment_mode = excluded.payment_mode,
      payment_description = excluded.payment_description,
      payment_proof_uri = excluded.payment_proof_uri`,
    createTimestampId(),
    input.period,
    input.propertyId,
    input.billingItemId,
    input.paidAt ?? null,
    input.paymentMode ?? null,
    input.paymentDescription ?? null,
    nextProof,
    new Date().toISOString(),
  );

  if (previous?.payment_proof_uri && previous.payment_proof_uri !== nextProof) {
    deleteStoredPhoto(previous.payment_proof_uri);
  }
}

/** Clears payment details and removes the proof photo. */
export async function clearMonthlyBillPayment({
  period,
  propertyId,
  billingItemId,
}: {
  period: string;
  propertyId: string;
  billingItemId: string;
}): Promise<void> {
  const db = await getDatabase();
  const previous = await db.getFirstAsync<{
    payment_proof_uri: string | null;
  }>(
    `SELECT payment_proof_uri FROM monthly_bill_entries
     WHERE period = ? AND property_id = ? AND billing_item_id = ?`,
    period,
    propertyId,
    billingItemId,
  );

  await db.runAsync(
    `UPDATE monthly_bill_entries
     SET paid_at = NULL, payment_mode = NULL, payment_description = NULL,
         payment_proof_uri = NULL
     WHERE period = ? AND property_id = ? AND billing_item_id = ?`,
    period,
    propertyId,
    billingItemId,
  );

  deleteStoredPhoto(previous?.payment_proof_uri);
}

export async function deleteMonthlyBillEntry({
  period,
  propertyId,
  billingItemId,
}: {
  period: string;
  propertyId: string;
  billingItemId: string;
}): Promise<void> {
  const db = await getDatabase();
  const previous = await db.getFirstAsync<{
    photo_uri: string | null;
    payment_proof_uri: string | null;
  }>(
    `SELECT photo_uri, payment_proof_uri FROM monthly_bill_entries
     WHERE period = ? AND property_id = ? AND billing_item_id = ?`,
    period,
    propertyId,
    billingItemId,
  );

  await db.runAsync(
    `DELETE FROM monthly_bill_entries
     WHERE period = ? AND property_id = ? AND billing_item_id = ?`,
    period,
    propertyId,
    billingItemId,
  );

  deleteStoredPhoto(previous?.photo_uri);
  deleteStoredPhoto(previous?.payment_proof_uri);
}
