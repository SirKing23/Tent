import { getDatabase } from "../../../services/database";
import type {
  BillingType,
  DueDateType,
  RecurringRule,
  UtilityType,
} from "../../bills/types";
import type { MonthlyOnlyBill } from "../types";
import { deleteMonthlyBillEntry } from "./monthlyBillingRepository";

type MonthlyBillItemRow = {
  id: string;
  period: string;
  property_id: string;
  name: string;
  utility_type: UtilityType | null;
  billing_type: BillingType;
  display_unit: string;
  default_amount: number | null;
  due_date_type: DueDateType;
  fixed_due_date: string | null;
  recurring_rule: RecurringRule | null;
  recurring_day: number | null;
  created_at: string;
};

const mapRow = (row: MonthlyBillItemRow): MonthlyOnlyBill => ({
  period: row.period,
  propertyId: row.property_id,
  bill: {
    id: row.id,
    name: row.name,
    utilityType: row.utility_type ?? "Other bills",
    billingType: row.billing_type,
    displayUnit: row.display_unit,
    defaultAmount: row.default_amount ?? undefined,
    dueDateType: row.due_date_type,
    fixedDueDate: row.fixed_due_date ?? undefined,
    recurringRule: row.recurring_rule ?? undefined,
    recurringDay: row.recurring_day ?? undefined,
    createdAt: row.created_at,
  },
});

/** Loads bills that were created for one property in one month only. */
export async function getMonthlyOnlyBills(
  period: string,
): Promise<MonthlyOnlyBill[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<MonthlyBillItemRow>(
      "SELECT * FROM monthly_bill_items WHERE period = ? ORDER BY rowid DESC",
      period,
    );
    return rows.map(mapRow);
  } catch (error) {
    console.error("Unable to load monthly-only bills:", error);
    return [];
  }
}

export async function saveMonthlyOnlyBill({
  period,
  propertyId,
  bill,
}: MonthlyOnlyBill): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO monthly_bill_items (
      id, period, property_id, name, utility_type, billing_type, display_unit,
      default_amount, due_date_type, fixed_due_date, recurring_rule,
      recurring_day, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      period = excluded.period,
      property_id = excluded.property_id,
      name = excluded.name,
      utility_type = excluded.utility_type,
      billing_type = excluded.billing_type,
      display_unit = excluded.display_unit,
      default_amount = excluded.default_amount,
      due_date_type = excluded.due_date_type,
      fixed_due_date = excluded.fixed_due_date,
      recurring_rule = excluded.recurring_rule,
      recurring_day = excluded.recurring_day,
      created_at = excluded.created_at`,
    bill.id,
    period,
    propertyId,
    bill.name,
    bill.utilityType ?? "Other bills",
    bill.billingType,
    bill.displayUnit,
    bill.defaultAmount ?? null,
    bill.dueDateType,
    bill.fixedDueDate ?? null,
    bill.recurringRule ?? null,
    bill.recurringDay ?? null,
    bill.createdAt,
  );
}

/** Removes a one-off bill plus its recorded amounts and payment for the month. */
export async function deleteMonthlyOnlyBill({
  period,
  propertyId,
  billingItemId,
}: {
  period: string;
  propertyId: string;
  billingItemId: string;
}): Promise<void> {
  await deleteMonthlyBillEntry({ period, propertyId, billingItemId });

  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM monthly_bill_items
     WHERE id = ? AND period = ? AND property_id = ?`,
    billingItemId,
    period,
    propertyId,
  );
}
