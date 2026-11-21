import {
  computeCashbookBalance,
  computeCashbookTotals,
  computeEntryBalances,
  filterCashbookEntries,
  filterCashbooks,
  formatEntryAmount,
} from "../cashbookCalculations";
import type { Cashbook, CashbookEntry } from "../../types";

const entry = (overrides: Partial<CashbookEntry> = {}): CashbookEntry => ({
  id: "entry-1",
  cashbookId: "book-1",
  type: "cashIn",
  amount: 100,
  paymentMode: "Cash",
  description: "Opening sale",
  date: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const book = (overrides: Partial<Cashbook> = {}): Cashbook => ({
  id: "book-1",
  title: "Main",
  description: "Daily cash",
  initialCashIn: 500,
  initialCashOut: 200,
  date: "",
  autoCreateMonthly: false,
  createdAt: "",
  ...overrides,
});

describe("computeEntryBalances", () => {
  it("nets cash in and cash out per cash book", () => {
    const balances = computeEntryBalances([
      entry({ id: "1", cashbookId: "a", amount: 100 }),
      entry({ id: "2", cashbookId: "a", type: "cashOut", amount: 40 }),
      entry({ id: "3", cashbookId: "b", type: "cashOut", amount: 25 }),
    ]);
    expect(balances).toEqual({ a: 60, b: -25 });
  });

  it("returns an empty map when there are no entries", () => {
    expect(computeEntryBalances([])).toEqual({});
  });
});

describe("book totals", () => {
  it("includes opening balances in the balance", () => {
    expect(computeCashbookBalance(book(), 60)).toBe(360);
  });

  it("sums opening and entry amounts for the inbox cards", () => {
    expect(
      computeCashbookTotals(book(), [
        entry({ amount: 100 }),
        entry({ id: "2", type: "cashOut", amount: 50 }),
      ]),
    ).toEqual({ totalCashIn: 600, totalCashOut: 250, balance: 350 });
  });
});

describe("formatEntryAmount", () => {
  it("prefixes cash in and cash out with the right sign", () => {
    expect(formatEntryAmount(entry({ amount: 1234.5 }))).toBe("+₱1,234.50");
    expect(formatEntryAmount(entry({ type: "cashOut", amount: 12 }))).toBe(
      "−₱12.00",
    );
  });
});

describe("filters", () => {
  it("searches cash books by title and description", () => {
    const books = [
      book({ id: "a", title: "Household", description: "" }),
      book({ id: "b", title: "Store", description: "Daily cash" }),
    ];
    expect(filterCashbooks(books, "daily").map((item) => item.id)).toEqual([
      "b",
    ]);
    expect(filterCashbooks(books, " ")).toHaveLength(2);
  });

  it("searches entries by description, payment mode, and direction", () => {
    const entries = [
      entry({ id: "a", description: "Groceries" }),
      entry({ id: "b", paymentMode: "GCash" }),
      entry({ id: "c", type: "cashOut" }),
    ];
    expect(
      filterCashbookEntries(entries, "grocer").map((item) => item.id),
    ).toEqual(["a"]);
    expect(
      filterCashbookEntries(entries, "gcash").map((item) => item.id),
    ).toEqual(["b"]);
    expect(
      filterCashbookEntries(entries, "cash out").map((item) => item.id),
    ).toEqual(["c"]);
  });
});
