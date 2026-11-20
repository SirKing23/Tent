import { buildPlaceholders, getDatabase } from "./db";

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

type CashbookRow = {
  id: string;
  title: string;
  description: string;
  initial_cash_in: number;
  initial_cash_out: number;
  date: string | null;
  auto_create_monthly: number;
  created_at: string | null;
};

const mapCashbookRow = (row: CashbookRow): Cashbook => ({
  id: row.id,
  title: row.title,
  description: row.description,
  initialCashIn: row.initial_cash_in,
  initialCashOut: row.initial_cash_out,
  date: row.date ?? "",
  autoCreateMonthly: row.auto_create_monthly === 1,
  createdAt: row.created_at ?? "",
});

export async function getCashbooks(): Promise<Cashbook[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CashbookRow>(
      "SELECT * FROM cashbooks ORDER BY rowid DESC",
    );
    return rows.map(mapCashbookRow);
  } catch (error) {
    console.error("Unable to load cash books:", error);
    return [];
  }
}

export async function saveCashbook(cashbook: Cashbook): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO cashbooks (
      id, title, description, initial_cash_in, initial_cash_out, date,
      auto_create_monthly, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      initial_cash_in = excluded.initial_cash_in,
      initial_cash_out = excluded.initial_cash_out,
      date = excluded.date,
      auto_create_monthly = excluded.auto_create_monthly,
      created_at = excluded.created_at`,
    cashbook.id,
    cashbook.title,
    cashbook.description,
    cashbook.initialCashIn,
    cashbook.initialCashOut,
    cashbook.date || null,
    cashbook.autoCreateMonthly ? 1 : 0,
    cashbook.createdAt || null,
  );
}

export async function deleteCashbooks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM cashbooks WHERE id IN (${buildPlaceholders(ids.length)})`,
    ids,
  );
}
