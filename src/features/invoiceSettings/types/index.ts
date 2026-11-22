export type InvoiceSettings = {
  /** Brand name shown in the invoice header. */
  title: string;
  /** Small line under the brand name. */
  subtitle: string;
  /** App-private image path, or null to use the default building icon. */
  iconUri: string | null;
  /** Note printed near the invoice total. */
  paymentNote: string;
  /** Optional image such as a GCash QR code. */
  footerImageUri: string | null;
};

export const DEFAULT_PAYMENT_NOTE =
  "Please settle this invoice on or before the due date shown above. This invoice summarizes the utility charges recorded in Tent.";

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  title: "TENT",
  subtitle: "Property billing",
  iconUri: null,
  paymentNote: DEFAULT_PAYMENT_NOTE,
  footerImageUri: null,
};
