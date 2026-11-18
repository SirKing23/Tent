import AsyncStorage from "@react-native-async-storage/async-storage";

export const CASHBOOKS_STORAGE_KEY = "@cashbooks";

export type Cashbook = {
  id: string;
  title: string;
  description: string;
  initialCashIn: number;
  initialCashOut: number;
  date: string;
  autoCreateMonthly: boolean;
  createdAt: string;
};

const isCashbook = (value: unknown): value is Cashbook => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Cashbook>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.description === "string" &&
    typeof item.initialCashIn === "number" &&
    typeof item.initialCashOut === "number"
  );
};

export async function getCashbooks(): Promise<Cashbook[]> {
  try {
    const raw = await AsyncStorage.getItem(CASHBOOKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCashbook) : [];
  } catch (error) {
    console.error("Unable to load cash books:", error);
    return [];
  }
}

export async function saveCashbooks(cashbooks: Cashbook[]): Promise<void> {
  await AsyncStorage.setItem(CASHBOOKS_STORAGE_KEY, JSON.stringify(cashbooks));
}

export async function saveCashbook(cashbook: Cashbook): Promise<void> {
  const cashbooks = await getCashbooks();
  const existingIndex = cashbooks.findIndex((item) => item.id === cashbook.id);
  if (existingIndex >= 0) cashbooks[existingIndex] = cashbook;
  else cashbooks.unshift(cashbook);
  await saveCashbooks(cashbooks);
}

export async function deleteCashbooks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const cashbooks = await getCashbooks();
  await saveCashbooks(cashbooks.filter((cashbook) => !idSet.has(cashbook.id)));
}

