import type { BillingItem } from "../../../bills/types";
import type { Cashbook, CashbookEntry } from "../../../cashbooks/types";
import type { MonthlyBillEntry } from "../../../monthlyBilling/types";
import type { Property } from "../../../properties/types";
import {
  buildBillingHistory,
  buildCashbookHistory,
  buildMeterConsumptionHistory,
  getMeterReportOptions,
} from "../reports";
import type { MeterConsumptionRecord } from "../../types";

const meterRecord = (
  overrides: Partial<MeterConsumptionRecord> = {},
): MeterConsumptionRecord => ({
  period: "2026-03",
  propertyId: "building-1",
  propertyName: "Main Building",
  billingItemId: "electricity",
  billName: "Electricity",
  billingType: "Meter reading",
  utilityType: "Electricity",
  displayUnit: "kWh",
  reading: 150,
  previousReading: 100,
  ...overrides,
});

const property = (overrides: Partial<Property> = {}): Property => ({
  id: "building-1",
  name: "Main Building",
  type: "Building",
  parentBuildingId: null,
  street: "",
  barangay: "",
  city: "",
  province: "",
  zipCode: "",
  country: "Philippines",
  photos: [],
  billIds: ["electricity"],
  subMeterBillIds: [],
  fixedBillShares: {},
  tenantIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const bill: BillingItem = {
  id: "electricity",
  name: "Electricity",
  utilityType: "Electricity",
  billingType: "Meter reading",
  displayUnit: "kWh",
  dueDateType: "Recurring monthly",
  recurringRule: "Day of the month",
  recurringDay: 15,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const monthlyEntry = (
  overrides: Partial<MonthlyBillEntry> = {},
): MonthlyBillEntry => ({
  id: "entry-1",
  period: "2026-03",
  propertyId: "building-1",
  billingItemId: "electricity",
  reading: 100,
  previousReading: 50,
  amount: 500,
  paidAt: "2026-03-10T00:00:00.000Z",
  note: "",
  createdAt: "2026-03-01T00:00:00.000Z",
  ...overrides,
});

const cashbook: Cashbook = {
  id: "cashbook-1",
  title: "Main",
  description: "",
  initialCashIn: 100,
  initialCashOut: 0,
  date: "",
  autoCreateMonthly: false,
  createdAt: "",
};

const cashbookEntry = (
  overrides: Partial<CashbookEntry> = {},
): CashbookEntry => ({
  id: "cash-entry-1",
  cashbookId: cashbook.id,
  type: "cashIn",
  amount: 100,
  paymentMode: "Cash",
  description: "Rent",
  date: "2026-03-15T00:00:00.000Z",
  createdAt: "2026-03-15T00:00:00.000Z",
  ...overrides,
});

describe("meter consumption history", () => {
  it("uses reading deltas and saved total-consumption values with month gaps", () => {
    const records = [
      meterRecord({ period: "2026-01", reading: 120, previousReading: 100 }),
      meterRecord({ period: "2026-03", reading: 220, previousReading: 180 }),
      meterRecord({
        period: "2026-02",
        billingItemId: "water",
        billName: "Water",
        billingType: "Total consumption",
        utilityType: "Water",
        displayUnit: "m³",
        reading: 12,
        previousReading: null,
      }),
    ];

    expect(
      buildMeterConsumptionHistory(records, "building-1", "electricity", 3),
    ).toEqual([
      { period: "2026-01", primary: 20, secondary: 0 },
      { period: "2026-02", primary: 0, secondary: 0 },
      { period: "2026-03", primary: 40, secondary: 0 },
    ]);
    expect(
      buildMeterConsumptionHistory(records, "building-1", "water", 1),
    ).toEqual([{ period: "2026-02", primary: 12, secondary: 0 }]);
  });

  it("omits meter resets and groups choices by property and bill", () => {
    const records = [
      meterRecord({ reading: 80, previousReading: 100 }),
      meterRecord({
        propertyId: "unit-1",
        propertyName: "Unit A",
      }),
    ];

    expect(
      buildMeterConsumptionHistory(records, "building-1", "electricity", 1),
    ).toEqual([{ period: "2026-03", primary: 0, secondary: 0 }]);
    expect(getMeterReportOptions(records)).toHaveLength(2);
  });
});

describe("financial report history", () => {
  it("does not add sub-metered unit charges on top of the building invoice", () => {
    const building = property();
    const unit = property({
      id: "unit-1",
      name: "Unit A",
      type: "Unit",
      parentBuildingId: building.id,
      billIds: [bill.id],
      subMeterBillIds: [bill.id],
    });

    const history = buildBillingHistory({
      properties: [building, unit],
      bills: [bill],
      tenants: [],
      entries: [
        monthlyEntry(),
        monthlyEntry({
          id: "unit-entry",
          propertyId: unit.id,
          reading: 10,
          previousReading: 0,
          amount: 100,
          paidAt: undefined,
        }),
      ],
      monthlyOnlyBills: [],
      count: 1,
    });

    expect(history[0]).toMatchObject({
      period: "2026-03",
      primary: 500,
      secondary: 500,
    });
  });

  it("aggregates registered cashbook entries by month and ignores deleted books", () => {
    const history = buildCashbookHistory(
      [cashbook],
      [
        cashbookEntry({ amount: 200 }),
        cashbookEntry({
          id: "cash-out",
          type: "cashOut",
          amount: 50,
          date: "2026-03-20T00:00:00.000Z",
        }),
        cashbookEntry({
          id: "orphan",
          cashbookId: "deleted",
          amount: 999,
        }),
      ],
      1,
    );

    expect(history).toEqual([
      { period: "2026-03", primary: 200, secondary: 50 },
    ]);
  });
});
