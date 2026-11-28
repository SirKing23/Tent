/**
 * Layout helpers for the shareable invoice image. Kept pure so the crop-free
 * sizing of the uploaded footer image and the bill detail lines can be tested
 * without rendering the card.
 */

export type InvoiceImageSource = { width: number; height: number };

/**
 * Size for the uploaded footer image (for example a GCash QR code).
 *
 * The image spans the invoice content width and keeps its own aspect ratio, so
 * a square QR code fills the width instead of being boxed into a small square.
 * Until the image reports its dimensions a square is assumed.
 */
export function getFooterImageSize({
  contentWidth,
  source,
}: {
  contentWidth: number;
  source?: InvoiceImageSource | null;
}): { width: number; height: number } {
  const width = Math.max(0, Math.round(contentWidth));
  const hasSize =
    source != null && source.width > 0 && source.height > 0;
  const aspect = hasSize ? source.width / source.height : 1;

  return { width, height: Math.round(width / aspect) };
}

type InvoiceBillDetailInput = {
  utilityType: string;
  displayUnit: string;
  dueDate?: string;
  reading?: number;
  previousReading?: number;
  consumption?: number;
  rate?: number;
};

const formatQuantity = (value: number): string =>
  value.toLocaleString("en-PH", { maximumFractionDigits: 2 });

/**
 * One detail per line for a bill on the invoice: utility type, due date,
 * meter reading, consumption, and the building's computed rate per unit.
 */
export function getInvoiceBillDetails(
  bill: InvoiceBillDetailInput,
  formatAmount: (value: number) => string,
): string[] {
  const unit = bill.displayUnit || "units";
  const details: string[] = [bill.utilityType];
  details.push(bill.dueDate ? `Due ${bill.dueDate}` : "No due date");

  if (bill.previousReading !== undefined && bill.reading !== undefined) {
    details.push(
      `${formatQuantity(bill.previousReading)} → ${formatQuantity(bill.reading)} ${unit}`,
    );
  } else if (bill.reading !== undefined) {
    details.push(`${formatQuantity(bill.reading)} ${unit} reading`);
  }

  if (bill.consumption !== undefined) {
    details.push(`${formatQuantity(bill.consumption)} ${unit} used`);
  }

  if (bill.rate !== undefined) {
    details.push(`Rate ${formatAmount(bill.rate)} per ${unit}`);
  }

  return details;
}
