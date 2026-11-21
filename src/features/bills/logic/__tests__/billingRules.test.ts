import {
  buildBillingItem,
  filterBills,
  getBillingSummary,
  getDueDateSummary,
  isSubMeterCandidate,
  pruneSubMeterBillIds,
  validateBillingDraft,
} from "../billingRules";
import type { BillingDraft, BillingItem } from "../../types";

const draft = (overrides: Partial<BillingDraft> = {}): BillingDraft => ({
  name: "Internet",
  utilityType: "Internet",
  billingType: "Fixed amount per month",
  displayUnit: "",
  defaultAmount: "",
  dueDateType: "No Due date",
  fixedDueDate: "",
  recurringRule: "Day of the month",
  recurringDay: "",
  ...overrides,
});

const bill = (overrides: Partial<BillingItem> = {}): BillingItem => ({
  id: "bill-1",
  name: "Electricity",
  utilityType: "Electricity",
  billingType: "Meter reading",
  displayUnit: "kWh",
  dueDateType: "Recurring monthly",
  recurringRule: "Day of the month",
  recurringDay: 15,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("validateBillingDraft", () => {
  it("requires a name", () => {
    expect(validateBillingDraft(draft({ name: "  " }))).toEqual({
      valid: false,
      title: "Name required",
      message: "Enter a name for this billing item.",
    });
  });

  it("rejects a non-numeric default amount but allows a blank one", () => {
    expect(validateBillingDraft(draft({ defaultAmount: "abc" }))).toMatchObject(
      { valid: false, title: "Invalid amount" },
    );
    expect(validateBillingDraft(draft({ defaultAmount: " " }))).toEqual({
      valid: true,
    });
  });

  it("requires a fixed date when that due-date type is selected", () => {
    expect(
      validateBillingDraft(draft({ dueDateType: "Fixed date" })),
    ).toMatchObject({ valid: false, title: "Due date required" });
  });

  it("requires a recurring day between 1 and 31", () => {
    const base = draft({
      dueDateType: "Recurring monthly",
      recurringRule: "Day of the month",
    });
    expect(validateBillingDraft({ ...base, recurringDay: "0" })).toMatchObject({
      valid: false,
      title: "Invalid recurring day",
    });
    expect(validateBillingDraft({ ...base, recurringDay: "32" })).toMatchObject(
      { valid: false, title: "Invalid recurring day" },
    );
    expect(validateBillingDraft({ ...base, recurringDay: "15" })).toEqual({
      valid: true,
    });
  });
});

describe("buildBillingItem", () => {
  it("trims text, parses the amount, and keeps only relevant due-date fields", () => {
    const item = buildBillingItem({
      id: "bill-1",
      createdAt: "2026-02-01T00:00:00.000Z",
      draft: draft({
        name: "  Water  ",
        defaultAmount: "1,250.5",
        dueDateType: "Fixed date",
        fixedDueDate: "03/05/2026",
        recurringRule: "Day of the month",
        recurringDay: "10",
      }),
    });

    expect(item).toEqual({
      id: "bill-1",
      name: "Water",
      utilityType: "Internet",
      billingType: "Fixed amount per month",
      displayUnit: "",
      defaultAmount: 1250.5,
      dueDateType: "Fixed date",
      fixedDueDate: "03/05/2026",
      recurringRule: undefined,
      recurringDay: undefined,
      createdAt: "2026-02-01T00:00:00.000Z",
    });
  });

  it("generates a slugged timestamp id when none is supplied", () => {
    jest.spyOn(Date, "now").mockReturnValue(1763680000000);
    const item = buildBillingItem({
      draft: draft({ name: "Laundry Service" }),
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    expect(item.id).toBe("1763680000000-laundry-service");
    jest.restoreAllMocks();
  });
});

describe("getDueDateSummary", () => {
  it("formats fixed, recurring, and passthrough due dates", () => {
    expect(
      getDueDateSummary(
        bill({ dueDateType: "Fixed date", fixedDueDate: "01/10/2026" }),
      ),
    ).toBe("01/10/2026");
    expect(
      getDueDateSummary(
        bill({
          dueDateType: "Recurring monthly",
          recurringRule: "Day of the month",
          recurringDay: 5,
        }),
      ),
    ).toBe("Day 5 of each month");
    expect(
      getDueDateSummary(
        bill({
          dueDateType: "Recurring monthly",
          recurringRule: "First day of the month",
        }),
      ),
    ).toBe("First day of the month");
  });
});

describe("lists", () => {
  it("filters by name, billing type, display unit, or due-date type", () => {
    const bills = [
      bill({
        id: "a",
        name: "Internet",
        billingType: "Fixed amount per month",
        displayUnit: "",
      }),
      bill({ id: "b", name: "Electricity" }),
    ];
    expect(filterBills(bills, "elect").map((item) => item.id)).toEqual(["b"]);
    expect(filterBills(bills, "kwh").map((item) => item.id)).toEqual(["b"]);
    expect(filterBills(bills, "")).toHaveLength(2);
  });

  it("summarizes totals", () => {
    const bills = [
      bill({ id: "a", defaultAmount: 100, dueDateType: "No Due date" }),
      bill({ id: "b", dueDateType: "Fixed date", fixedDueDate: "01/01/2026" }),
      bill({ id: "c", dueDateType: "Recurring monthly" }),
    ];
    expect(getBillingSummary(bills)).toEqual({
      total: 3,
      withAmount: 1,
      recurring: 1,
    });
  });
});

describe("sub-meter rules", () => {
  const bills = [
    bill({ id: "consumption", billingType: "Total consumption" }),
    bill({ id: "fixed", billingType: "Fixed amount per month" }),
  ];

  it("only offers sub-metering to units whose parent carries a consumption bill", () => {
    expect(
      isSubMeterCandidate({
        propertyType: "Unit",
        billingType: "Meter reading",
        isInParentBuilding: true,
      }),
    ).toBe(true);
    expect(
      isSubMeterCandidate({
        propertyType: "Building",
        billingType: "Meter reading",
        isInParentBuilding: true,
      }),
    ).toBe(false);
    expect(
      isSubMeterCandidate({
        propertyType: "Unit",
        billingType: "Fixed amount per month",
        isInParentBuilding: true,
      }),
    ).toBe(false);
  });

  it("drops stale sub-meter selections on save", () => {
    expect(
      pruneSubMeterBillIds({
        subMeterBillIds: ["consumption", "fixed", "missing"],
        billIds: ["consumption", "fixed"],
        propertyType: "Unit",
        parentBillIds: ["consumption"],
        bills,
      }),
    ).toEqual(["consumption"]);
  });

  it("clears sub-meter selections for buildings or units without a parent", () => {
    expect(
      pruneSubMeterBillIds({
        subMeterBillIds: ["consumption"],
        billIds: ["consumption"],
        propertyType: "Building",
        parentBillIds: ["consumption"],
        bills,
      }),
    ).toEqual([]);
    expect(
      pruneSubMeterBillIds({
        subMeterBillIds: ["consumption"],
        billIds: ["consumption"],
        propertyType: "Unit",
        parentBillIds: undefined,
        bills,
      }),
    ).toEqual([]);
  });
});
