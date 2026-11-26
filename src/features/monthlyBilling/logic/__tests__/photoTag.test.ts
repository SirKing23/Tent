import type { BillingItem } from "../../../bills/types";
import type { Property } from "../../../properties/types";
import type { MonthlyBillEntry, MonthlyOnlyBill } from "../../types";
import { buildPhotoTagOptions, buildPhotoTagTarget } from "../photoTag";

const makeProperty = (overrides: Partial<Property> = {}): Property => ({
  id: "property-1",
  name: "Sunrise Apartments",
  type: "Building",
  parentBuildingId: null,
  street: "1 Mabini St",
  barangay: "Poblacion",
  city: "Makati",
  province: "Metro Manila",
  zipCode: "1210",
  country: "Philippines",
  photos: [],
  billIds: [],
  subMeterBillIds: [],
  fixedBillShares: {},
  tenantIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const makeBill = (overrides: Partial<BillingItem> = {}): BillingItem => ({
  id: "bill-1",
  name: "Electricity",
  utilityType: "Electricity",
  billingType: "Meter reading",
  displayUnit: "kWh",
  dueDateType: "Recurring monthly",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const makeEntry = (
  overrides: Partial<MonthlyBillEntry> = {},
): MonthlyBillEntry => ({
  id: "entry-1",
  period: "2026-11",
  propertyId: "property-1",
  billingItemId: "bill-1",
  note: "",
  createdAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

describe("buildPhotoTagOptions", () => {
  it("lists a property's linked bills, buildings first", () => {
    const building = makeProperty({
      id: "building",
      billIds: ["water", "electricity"],
    });
    const unit = makeProperty({
      id: "unit",
      type: "Unit",
      parentBuildingId: "building",
      billIds: ["electricity"],
    });
    const options = buildPhotoTagOptions({
      properties: [unit, building],
      bills: [
        makeBill({ id: "electricity" }),
        makeBill({ id: "water", name: "Water", utilityType: "Water" }),
      ],
      monthlyOnlyBills: [],
      period: "2026-11",
    });

    expect(options.map((option) => option.property.id)).toEqual([
      "building",
      "unit",
    ]);
    expect(options[0].bills.map((bill) => bill.id)).toEqual([
      "water",
      "electricity",
    ]);
    expect(options[1].bills.map((bill) => bill.id)).toEqual(["electricity"]);
  });

  it("adds one-off bills only for the selected month", () => {
    const property = makeProperty({ billIds: ["electricity"] });
    const monthlyOnlyBills: MonthlyOnlyBill[] = [
      {
        period: "2026-11",
        propertyId: property.id,
        bill: makeBill({ id: "repair", name: "Repair" }),
      },
      {
        period: "2026-10",
        propertyId: property.id,
        bill: makeBill({ id: "october-only", name: "October only" }),
      },
    ];

    const november = buildPhotoTagOptions({
      properties: [property],
      bills: [makeBill({ id: "electricity" })],
      monthlyOnlyBills,
      period: "2026-11",
    });
    const october = buildPhotoTagOptions({
      properties: [property],
      bills: [makeBill({ id: "electricity" })],
      monthlyOnlyBills,
      period: "2026-10",
    });

    expect(november[0].bills.map((bill) => bill.id)).toEqual([
      "electricity",
      "repair",
    ]);
    expect(october[0].bills.map((bill) => bill.id)).toEqual([
      "electricity",
      "october-only",
    ]);
  });

  it("keeps properties without bills so the sheet can explain the gap", () => {
    const options = buildPhotoTagOptions({
      properties: [makeProperty({ id: "empty" })],
      bills: [],
      monthlyOnlyBills: [],
      period: "2026-11",
    });

    expect(options).toHaveLength(1);
    expect(options[0].bills).toEqual([]);
  });
});

describe("buildPhotoTagTarget", () => {
  const entry = makeEntry({ reading: 120, previousReading: 100, amount: 500 });

  it("records the invoice for a metered building bill", () => {
    const target = buildPhotoTagTarget({
      property: makeProperty(),
      bill: makeBill(),
      photoUri: "file:///captured.jpg",
      entry,
      previousEntry: makeEntry({ period: "2026-10", reading: 100 }),
    });

    expect(target.mode).toBe("invoice");
    expect(target.entry).toBe(entry);
    expect(target.initialPhotoUri).toBe("file:///captured.jpg");
    expect(target.amountSuggestion).toBe(500);
    expect(target.previousReadingSuggestion).toBe(100);
  });

  it("records a reading for a metered unit, priced by the building rate", () => {
    const target = buildPhotoTagTarget({
      property: makeProperty({
        id: "unit",
        type: "Unit",
        parentBuildingId: "property-1",
      }),
      bill: makeBill(),
      parentEntry: makeEntry({ reading: 200, previousReading: 100, amount: 400 }),
    });

    expect(target.mode).toBe("reading");
    expect(target.rate).toBe(4);
  });

  it("leaves the unit rate undefined until the building has consumption", () => {
    const target = buildPhotoTagTarget({
      property: makeProperty({
        id: "unit",
        type: "Unit",
        parentBuildingId: "property-1",
      }),
      bill: makeBill(),
      parentEntry: makeEntry({ reading: 100, previousReading: 100, amount: 400 }),
    });

    expect(target.mode).toBe("reading");
    expect(target.rate).toBeUndefined();
  });

  it("records an amount for a non-metered bill", () => {
    const target = buildPhotoTagTarget({
      property: makeProperty({ id: "unit", type: "Unit" }),
      bill: makeBill({ id: "dues", billingType: "Fixed amount per month" }),
    });

    expect(target.mode).toBe("amount");
    expect(target.rate).toBeUndefined();
  });

  it("does not ask for an amount when the unit has a fixed share", () => {
    const target = buildPhotoTagTarget({
      property: makeProperty({
        id: "unit",
        type: "Unit",
        fixedBillShares: { dues: 400 },
      }),
      bill: makeBill({ id: "dues", billingType: "Fixed amount per month" }),
    });

    expect(target.photoOnly).toBe(true);
  });
});
