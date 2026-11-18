import AsyncStorage from "@react-native-async-storage/async-storage";

export const CASHBOOK_ENTRIES_STORAGE_KEY = "@cashbook_entries";

export type CashbookEntryType = "cashIn" | "cashOut";

export type CashbookEntry = {
  id: string;
  cashbookId: string;
  type: CashbookEntryType;
  amount: number;
  paymentMode: string;
  description: string;
  date: string;
  imageUri?: string;
  createdAt: string;
};

const isEntry = (value: unknown): value is CashbookEntry => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CashbookEntry>;
  return (
    typeof item.id === "string" &&
    typeof item.cashbookId === "string" &&
    (item.type === "cashIn" || item.type === "cashOut") &&
    typeof item.amount === "number" &&
    typeof item.paymentMode === "string" &&
    typeof item.description === "string" &&
    typeof item.date === "string"
  );
};

export async function getCashbookEntries(): Promise<CashbookEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CASHBOOK_ENTRIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch (error) {
    console.error("Unable to load cash-book entries:", error);
    return [];
  }
}

export async function getEntriesForCashbook(
  cashbookId: string,
): Promise<CashbookEntry[]> {
  const entries = await getCashbookEntries();
  return entries
    .filter((entry) => entry.cashbookId === cashbookId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveCashbookEntry(entry: CashbookEntry): Promise<void> {
  const entries = await getCashbookEntries();
  const existingIndex = entries.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) entries[existingIndex] = entry;
  else entries.unshift(entry);
  await AsyncStorage.setItem(CASHBOOK_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
}

export async function deleteCashbookEntries(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const entries = await getCashbookEntries();
  await AsyncStorage.setItem(
    CASHBOOK_ENTRIES_STORAGE_KEY,
    JSON.stringify(entries.filter((entry) => !idSet.has(entry.id))),
  );
}

