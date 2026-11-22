import { DEFAULT_INVOICE_SETTINGS, type InvoiceSettings } from "../types";

const asString = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const asOptionalString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

/** Parses the stored JSON, merging missing or invalid fields with defaults. */
export const parseInvoiceSettings = (
  value: string | null | undefined,
): InvoiceSettings => {
  if (!value) return { ...DEFAULT_INVOICE_SETTINGS };

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_INVOICE_SETTINGS };
    }

    const record = parsed as Record<string, unknown>;
    const title = asString(record.title, "").trim();
    return {
      title: title || DEFAULT_INVOICE_SETTINGS.title,
      subtitle: asString(record.subtitle, DEFAULT_INVOICE_SETTINGS.subtitle),
      iconUri: asOptionalString(record.iconUri),
      paymentNote: asString(
        record.paymentNote,
        DEFAULT_INVOICE_SETTINGS.paymentNote,
      ),
      footerImageUri: asOptionalString(record.footerImageUri),
    };
  } catch {
    return { ...DEFAULT_INVOICE_SETTINGS };
  }
};
