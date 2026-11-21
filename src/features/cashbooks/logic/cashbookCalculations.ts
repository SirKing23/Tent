import { formatPesoAbsolute } from "../../../utils/currency";

import type { Cashbook, CashbookEntry } from "../types";

/** Net movement per cash book, keyed by cash-book id. */
export const computeEntryBalances = (
  entries: readonly CashbookEntry[],
): Record<string, number> =>
  entries.reduce<Record<string, number>>((result, entry) => {
    const currentBalance = result[entry.cashbookId] ?? 0;
    result[entry.cashbookId] =
      currentBalance + (entry.type === "cashIn" ? entry.amount : -entry.amount);
    return result;
  }, {});

type CashbookOpeningBalance = Pick<Cashbook, "initialCashIn" | "initialCashOut">;

/** Opening balances plus the net of that book's entries. */
export const computeCashbookBalance = (
  cashbook: CashbookOpeningBalance,
  entryBalance = 0,
): number =>
  cashbook.initialCashIn - cashbook.initialCashOut + entryBalance;

export type CashbookTotals = {
  totalCashIn: number;
  totalCashOut: number;
  balance: number;
};

/** Opening balances included, matching the inbox summary cards. */
export const computeCashbookTotals = (
  cashbook: CashbookOpeningBalance,
  entries: readonly CashbookEntry[],
): CashbookTotals => {
  const totalCashIn = entries.reduce(
    (total, entry) => total + (entry.type === "cashIn" ? entry.amount : 0),
    cashbook.initialCashIn,
  );
  const totalCashOut = entries.reduce(
    (total, entry) => total + (entry.type === "cashOut" ? entry.amount : 0),
    cashbook.initialCashOut,
  );
  return {
    totalCashIn,
    totalCashOut,
    balance: totalCashIn - totalCashOut,
  };
};

/** `−₱120.00` for cash out, `+₱120.00` for cash in. */
export const formatEntryAmount = (
  entry: Pick<CashbookEntry, "type" | "amount">,
): string =>
  `${entry.type === "cashOut" ? "−" : "+"}${formatPesoAbsolute(entry.amount)}`;

export const filterCashbooks = (
  cashbooks: readonly Cashbook[],
  query: string,
): Cashbook[] => {
  const search = query.trim().toLowerCase();
  if (!search) return [...cashbooks];
  return cashbooks.filter(
    (cashbook) =>
      cashbook.title.toLowerCase().includes(search) ||
      cashbook.description.toLowerCase().includes(search),
  );
};

export const filterCashbookEntries = (
  entries: readonly CashbookEntry[],
  query: string,
): CashbookEntry[] => {
  const search = query.trim().toLowerCase();
  if (!search) return [...entries];
  return entries.filter(
    (entry) =>
      entry.description.toLowerCase().includes(search) ||
      entry.paymentMode.toLowerCase().includes(search) ||
      (entry.type === "cashIn" ? "cash in" : "cash out").includes(search),
  );
};
