import { getDatabase } from "../../../services/database";
import type { MeterConsumptionRecord } from "../types";

type MeterConsumptionRow = {
  period: string;
  property_id: string;
  property_name: string | null;
  billing_item_id: string;
  bill_name: string | null;
  billing_type: "Meter reading" | "Total consumption";
  utility_type: MeterConsumptionRecord["utilityType"];
  display_unit: string;
  reading: number;
  previous_reading: number | null;
};

/** Loads historical meter values with the bill/property names available now. */
export async function getMeterConsumptionRecords(): Promise<
  MeterConsumptionRecord[]
> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MeterConsumptionRow>(
    `SELECT
       entry.period,
       entry.property_id,
       property.name AS property_name,
       entry.billing_item_id,
       COALESCE(monthly_bill.name, billing_item.name) AS bill_name,
       COALESCE(monthly_bill.billing_type, billing_item.billing_type) AS billing_type,
       COALESCE(monthly_bill.utility_type, billing_item.utility_type, 'Other bills') AS utility_type,
       COALESCE(monthly_bill.display_unit, billing_item.display_unit, '') AS display_unit,
       entry.reading,
       entry.previous_reading
     FROM monthly_bill_entries AS entry
     LEFT JOIN properties AS property
       ON property.id = entry.property_id
     LEFT JOIN monthly_bill_items AS monthly_bill
       ON monthly_bill.id = entry.billing_item_id
       AND monthly_bill.period = entry.period
       AND monthly_bill.property_id = entry.property_id
     LEFT JOIN billing_items AS billing_item
       ON billing_item.id = entry.billing_item_id
     WHERE entry.reading IS NOT NULL
       AND COALESCE(monthly_bill.billing_type, billing_item.billing_type)
         IN ('Meter reading', 'Total consumption')
     ORDER BY entry.period, property.name, bill_name`,
  );

  return rows.map((row) => ({
    period: row.period,
    propertyId: row.property_id,
    propertyName: row.property_name || "Deleted property",
    billingItemId: row.billing_item_id,
    billName: row.bill_name || "Deleted bill",
    billingType: row.billing_type,
    utilityType: row.utility_type,
    displayUnit: row.display_unit,
    reading: row.reading,
    previousReading: row.previous_reading,
  }));
}
