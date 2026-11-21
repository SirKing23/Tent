import { buildPlaceholders, getDatabase } from "../../../services/database";
import type {
  BillingItem,
  BillingType,
  DueDateType,
  RecurringRule,
  UtilityType,
} from "../types";

type BillingItemRow = {
  id: string;
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

const mapBillingItemRow = (row: BillingItemRow): BillingItem => ({
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
});

export async function getBillingItems(): Promise<BillingItem[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<BillingItemRow>(
      "SELECT * FROM billing_items ORDER BY rowid DESC",
    );
    return rows.map(mapBillingItemRow);
  } catch (error) {
    console.error("Unable to load billing items:", error);
    return [];
  }
}

export async function saveBillingItem(item: BillingItem): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO billing_items (
      id, name, utility_type, billing_type, display_unit, default_amount,
      due_date_type, fixed_due_date, recurring_rule, recurring_day, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
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
    item.id,
    item.name,
    item.utilityType ?? "Other bills",
    item.billingType,
    item.displayUnit,
    item.defaultAmount ?? null,
    item.dueDateType,
    item.fixedDueDate ?? null,
    item.recurringRule ?? null,
    item.recurringDay ?? null,
    item.createdAt,
  );
}

export async function deleteBillingItems(ids: string[]): Promise<string[]> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];

  const db = await getDatabase();
  const requestedIds = new Set(uniqueIds);
  let blockedIds: string[] = [];

  await db.withExclusiveTransactionAsync(async (transaction) => {
    const properties = await transaction.getAllAsync<{
      name: string;
      bill_ids: string;
    }>("SELECT name, bill_ids FROM properties");
    const usedIds = new Set<string>();

    for (const property of properties) {
      const billIds: unknown = JSON.parse(property.bill_ids || "[]");
      if (
        !Array.isArray(billIds) ||
        !billIds.every((billId) => typeof billId === "string")
      ) {
        throw new Error(
          `Unable to verify billing items assigned to property "${property.name}".`,
        );
      }

      for (const billId of billIds) {
        if (requestedIds.has(billId)) usedIds.add(billId);
      }
    }

    blockedIds = uniqueIds.filter((id) => usedIds.has(id));
    const deletableIds = uniqueIds.filter((id) => !usedIds.has(id));
    if (deletableIds.length > 0) {
      await transaction.runAsync(
        `DELETE FROM billing_items WHERE id IN (${buildPlaceholders(deletableIds.length)})`,
        deletableIds,
      );
    }
  });

  return blockedIds;
}
