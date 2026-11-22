import { getDatabase } from "../../../services/database";
import { parseInvoiceSettings } from "../logic/invoiceSettings";
import type { InvoiceSettings } from "../types";

/** Single meta row so invoice customization follows the app database. */
const SETTINGS_KEY = "invoice.settings";

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM meta WHERE key = ?",
      SETTINGS_KEY,
    );
    return parseInvoiceSettings(row?.value);
  } catch (error) {
    console.error("Unable to load invoice settings:", error);
    return parseInvoiceSettings(null);
  }
}

export async function saveInvoiceSettings(
  settings: InvoiceSettings,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    SETTINGS_KEY,
    JSON.stringify({
      title: settings.title.trim(),
      subtitle: settings.subtitle.trim(),
      iconUri: settings.iconUri,
      paymentNote: settings.paymentNote.trim(),
      footerImageUri: settings.footerImageUri,
    }),
  );
}
