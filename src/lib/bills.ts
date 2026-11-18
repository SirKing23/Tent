import AsyncStorage from "@react-native-async-storage/async-storage";

export const BILLING_ITEMS_STORAGE_KEY = "@billing_items";

export const BILLING_TYPES = [
  "Fixed amount per month",
  "Total consumption",
  "Meter reading",
  "Split across units",
  "Per Person",
] as const;

export const UTILITY_TYPES = [
  "Internet",
  "Water",
  "Electricity",
  "Rent",
  "Other bills",
] as const;

export const DUE_DATE_TYPES = [
  "Fixed date",
  "No Due date",
  "Recurring monthly",
] as const;

export const RECURRING_RULES = [
  "Day of the month",
  "First day of the month",
  "Every last day of the month",
] as const;

export type BillingType = (typeof BILLING_TYPES)[number];
export type UtilityType = (typeof UTILITY_TYPES)[number];
export type DueDateType = (typeof DUE_DATE_TYPES)[number];
export type RecurringRule = (typeof RECURRING_RULES)[number];

export type BillingItem = {
  id: string;
  name: string;
  utilityType: UtilityType;
  billingType: BillingType;
  displayUnit: string;
  defaultAmount?: number;
  dueDateType: DueDateType;
  fixedDueDate?: string;
  recurringRule?: RecurringRule;
  recurringDay?: number;
  createdAt: string;
};

const isBillingItem = (
  value: unknown,
): value is BillingItem & { utilityType?: UtilityType } => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<BillingItem>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    (item.utilityType === undefined ||
      UTILITY_TYPES.includes(item.utilityType as UtilityType)) &&
    typeof item.billingType === "string" &&
    typeof item.displayUnit === "string" &&
    (item.defaultAmount === undefined || typeof item.defaultAmount === "number") &&
    typeof item.dueDateType === "string" &&
    typeof item.createdAt === "string"
  );
};

export async function getBillingItems(): Promise<BillingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(BILLING_ITEMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(isBillingItem).map((item) => ({
          ...item,
          utilityType: item.utilityType ?? "Other bills",
        }))
      : [];
  } catch (error) {
    console.error("Unable to load billing items:", error);
    return [];
  }
}

export async function saveBillingItem(item: BillingItem): Promise<void> {
  const items = await getBillingItems();
  const existingIndex = items.findIndex((current) => current.id === item.id);
  if (existingIndex >= 0) items[existingIndex] = item;
  else items.unshift(item);
  await AsyncStorage.setItem(BILLING_ITEMS_STORAGE_KEY, JSON.stringify(items));
}

export async function deleteBillingItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const items = await getBillingItems();
  await AsyncStorage.setItem(
    BILLING_ITEMS_STORAGE_KEY,
    JSON.stringify(items.filter((item) => !idSet.has(item.id))),
  );
}
