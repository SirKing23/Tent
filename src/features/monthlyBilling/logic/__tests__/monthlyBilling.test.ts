import type { BillingItem } from "../../../bills/types";
import type { Property } from "../../../properties/types";
import type { Tenant } from "../../../tenants/types";
import type { MonthlyBillEntry } from "../../types";
import {
  buildMonthlyBillingReport,
  mergeMonthlyOnlyBills,
  resolveBillingHighlight,
  suggestPreviousReading,
} from "../monthlyBilling";

const bill = (overrides: Partial<BillingItem> = {}): BillingItem => ({
  id: "electricity",
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

const property = (overrides: Partial<Property> = {}): Property => ({
  id: "building-1",
  name: "Main Building",
  type: "Building",
  parentBuildingId: null,
  street: "1 Main St",
  barangay: "",
  city: "Makati",
  province: "Metro Manila",
  zipCode: "",
  country: "Philippines",
  photos: [],
  billIds: [],
  subMeterBillIds: [],
  fixedBillShares: {},
  tenantIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const unit = (overrides: Partial<Property> = {}): Property =>
  property({
    id: "unit-1",
    name: "Unit A",
    type: "Unit",
    parentBuildingId: "building-1",
    ...overrides,
  });

const tenant = (overrides: Partial<Tenant> = {}): Tenant => ({
  id: "tenant-1",
  tenantStatus: "Active",
  photo: null,
  firstName: "Ana",
  middleName: "",
  lastName: "Cruz",
  phone: "",
  email: "",
  idType: "",
  idNumber: "",
  idPhoto: null,
  ...overrides,
});

const entry = (overrides: Partial<MonthlyBillEntry> = {}): MonthlyBillEntry => ({
  id: "entry-1",
  period: "2026-11",
  propertyId: "building-1",
  billingItemId: "electricity",
  note: "",
  createdAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

const buildReport = ({
  bills = [bill()],
  properties,
  tenants = [],
  entries = [],
}: {
  bills?: BillingItem[];
  properties: Property[];
  tenants?: Tenant[];
  entries?: MonthlyBillEntry[];
}) =>
  buildMonthlyBillingReport({
    period: "2026-11",
    properties,
    bills,
    tenants,
    entries,
  });

describe("metered bills with sub-meters", () => {
  const building = property({ billIds: ["electricity"] });
  const unitA = unit({
    id: "unit-a",
    name: "Unit A",
    billIds: ["electricity"],
    subMeterBillIds: ["electricity"],
  });
  const unitB = unit({
    id: "unit-b",
    name: "Unit B",
    billIds: ["electricity"],
    subMeterBillIds: ["electricity"],
  });

  it("derives the rate and deducts sub-meter readings from the building invoice", () => {
    const result = buildReport({
      properties: [building, unitA, unitB],
      entries: [
        entry({ reading: 500, amount: 5000 }),
        entry({ id: "entry-a", propertyId: "unit-a", reading: 120 }),
        entry({ id: "entry-b", propertyId: "unit-b", reading: 80 }),
      ],
    });

    const line = result.buildings[0].lines[0];
    expect(line.rate).toBe(10);
    expect(line.charges.map((charge) => charge.amount)).toEqual([1200, 800]);
    expect(line.coveredAmount).toBe(2000);
    expect(line.ownerAmount).toBe(3000);
    expect(result.buildings[0].ownerNet).toBe(3000);
    expect(result.totals).toMatchObject({
      gross: 5000,
      tenantCovered: 2000,
      ownerNet: 3000,
      missingCount: 0,
    });
  });

  it("collapses unit bills into a summary for the building card", () => {
    const result = buildReport({
      properties: [building, unitA, unitB],
      entries: [
        entry({ reading: 500, amount: 5000 }),
        entry({
          id: "entry-a",
          propertyId: "unit-a",
          reading: 120,
          paidAt: "2026-11-05T10:00:00.000Z",
        }),
        entry({ id: "entry-b", propertyId: "unit-b", reading: 80 }),
      ],
    });

    expect(result.buildings[0].unitSummary).toEqual({
      unitCount: 2,
      billCount: 2,
      paidCount: 1,
      unpaidCount: 1,
      total: 2000,
    });
  });

  it("does not deduct units that are not flagged as sub-metered", () => {
    const result = buildReport({
      properties: [building, unitA, { ...unitB, subMeterBillIds: [] }],
      entries: [
        entry({ reading: 500, amount: 5000 }),
        entry({ id: "entry-a", propertyId: "unit-a", reading: 120 }),
        entry({ id: "entry-b", propertyId: "unit-b", reading: 80 }),
      ],
    });

    const line = result.buildings[0].lines[0];
    expect(line.charges.map((charge) => charge.unit.id)).toEqual(["unit-a"]);
    expect(line.ownerAmount).toBe(3800);
  });

  it("allows a negative owner share when sub-meters exceed the invoice", () => {
    const result = buildReport({
      properties: [building, unitA],
      entries: [
        entry({ reading: 100, amount: 1000 }),
        entry({ id: "entry-a", propertyId: "unit-a", reading: 150 }),
      ],
    });

    const line = result.buildings[0].lines[0];
    expect(line.ownerAmount).toBe(-500);
    expect(result.buildings[0].hasOverDeduction).toBe(true);
  });

  it("carries evidence photos without changing the calculation", () => {
    const result = buildReport({
      properties: [building, unitA],
      entries: [
        entry({
          reading: 100,
          amount: 1000,
          photoUri: "photos/building-meter.jpg",
        }),
        entry({
          id: "entry-a",
          propertyId: "unit-a",
          reading: 10,
          photoUri: "photos/unit-meter.jpg",
        }),
      ],
    });

    const line = result.buildings[0].lines[0];
    expect(line.entry?.photoUri).toBe("photos/building-meter.jpg");
    expect(line.charges[0].photoUri).toBe("photos/unit-meter.jpg");
    expect(result.buildings[0].units[0].lines[0].photoUri).toBe(
      "photos/unit-meter.jpg",
    );
    expect(line.ownerAmount).toBe(900);
  });

  it("carries payment details without changing the calculation", () => {
    const result = buildReport({
      properties: [building, unitA],
      entries: [
        entry({
          reading: 100,
          amount: 1000,
          paidAt: "2026-11-05T10:00:00.000Z",
          paymentMode: "GCash",
          paymentDescription: "Ref 12345",
          paymentProofUri: "photos/proof.jpg",
        }),
        entry({
          id: "entry-a",
          propertyId: "unit-a",
          reading: 10,
          paidAt: "2026-11-06T10:00:00.000Z",
          paymentMode: "Cash",
          paymentDescription: "Paid in cash",
        }),
      ],
    });

    const line = result.buildings[0].lines[0];
    expect(line.entry?.paidAt).toBe("2026-11-05T10:00:00.000Z");
    expect(line.entry?.paymentMode).toBe("GCash");
    expect(line.entry?.paymentProofUri).toBe("photos/proof.jpg");
    expect(line.ownerAmount).toBe(900);
    expect(result.buildings[0].units[0].lines[0].paidAt).toBe(
      "2026-11-06T10:00:00.000Z",
    );
    expect(result.totals.ownerNet).toBe(900);
  });

  it("counts paid and unpaid bill lines", () => {
    const result = buildReport({
      properties: [building, unitA, unitB],
      entries: [
        entry({
          reading: 500,
          amount: 5000,
          paidAt: "2026-11-05T10:00:00.000Z",
        }),
        entry({ id: "entry-a", propertyId: "unit-a", reading: 120 }),
        entry({
          id: "entry-b",
          propertyId: "unit-b",
          reading: 80,
          paidAt: "2026-11-06T10:00:00.000Z",
        }),
      ],
    });

    expect(result.totals.paidCount).toBe(2);
    expect(result.totals.unpaidCount).toBe(1);
  });

  it("counts bills without recorded amounts as unpaid", () => {
    const result = buildReport({
      properties: [building],
      entries: [],
    });

    expect(result.totals.paidCount).toBe(0);
    expect(result.totals.unpaidCount).toBe(1);
  });

  it("reports missing readings and missing invoices without inventing amounts", () => {
    const missingReading = buildReport({
      properties: [building, unitA],
      entries: [entry({ reading: 100, amount: 1000 })],
    });
    expect(
      missingReading.buildings[0].lines[0].charges[0].status,
    ).toBe("missing-reading");
    expect(missingReading.totals.missingCount).toBe(1);

    const missingInvoice = buildReport({
      properties: [building, unitA],
      entries: [entry({ id: "entry-a", propertyId: "unit-a", reading: 10 })],
    });
    expect(missingInvoice.buildings[0].lines[0].missing).toBe(true);
    expect(missingInvoice.totals.missingCount).toBeGreaterThan(0);
  });
});

describe("meter reading consumption", () => {
  const building = property({ billIds: ["electricity"] });
  const unitA = unit({
    id: "unit-a",
    billIds: ["electricity"],
    subMeterBillIds: ["electricity"],
  });

  it("computes consumption from previous and current readings", () => {
    const result = buildReport({
      properties: [building, unitA],
      entries: [
        entry({ reading: 600, previousReading: 500, amount: 1000 }),
        entry({
          id: "entry-a",
          propertyId: "unit-a",
          reading: 130,
          previousReading: 120,
        }),
      ],
    });

    const line = result.buildings[0].lines[0];
    expect(line.previousReading).toBe(500);
    expect(line.consumption).toBe(100);
    expect(line.rate).toBe(10);
    expect(line.charges[0].previousReading).toBe(120);
    expect(line.charges[0].consumption).toBe(10);
    expect(line.charges[0].amount).toBe(100);
    expect(line.ownerAmount).toBe(900);
    expect(result.buildings[0].units[0].lines[0].consumption).toBe(10);
  });

  it("rounds floating-point consumption to two decimals", () => {
    const result = buildReport({
      properties: [building],
      entries: [
        entry({ reading: 125.7, previousReading: 124.3, amount: 14 }),
      ],
    });

    const line = result.buildings[0].lines[0];
    expect(line.consumption).toBe(1.4);
    expect(line.rate).toBe(10);
  });

  it("treats a missing previous reading as zero", () => {
    const result = buildReport({
      properties: [building],
      entries: [entry({ reading: 120, amount: 1200 })],
    });

    expect(result.buildings[0].lines[0].consumption).toBe(120);
    expect(result.buildings[0].lines[0].rate).toBe(10);
  });

  it("suggests the previous month's current reading, defaulting to zero", () => {
    expect(suggestPreviousReading(undefined)).toBe(0);
    expect(suggestPreviousReading(entry({ reading: 480 }))).toBe(480);
  });

  it("flags a current reading lower than the previous reading", () => {
    const result = buildReport({
      properties: [building, unitA],
      entries: [
        entry({ reading: 500, previousReading: 600, amount: 1000 }),
        entry({
          id: "entry-a",
          propertyId: "unit-a",
          reading: 100,
          previousReading: 90,
        }),
      ],
    });

    const line = result.buildings[0].lines[0];
    expect(line.consumption).toBeUndefined();
    expect(line.charges[0].status).toBe("missing-rate");
  });

  it("ignores previous readings for Total consumption bills", () => {
    const total = bill({ billingType: "Total consumption" });
    const result = buildReport({
      bills: [total],
      properties: [building],
      entries: [
        entry({ reading: 120, previousReading: 100, amount: 1200 }),
      ],
    });

    expect(result.buildings[0].lines[0].consumption).toBe(120);
    expect(result.buildings[0].lines[0].rate).toBe(10);
  });
});

describe("fixed-share bills", () => {
  const fixed = bill({
    billingType: "Fixed amount per month",
    defaultAmount: 1500,
  });
  const building = property({ billIds: ["electricity"] });
  const unitA = unit({
    id: "unit-a",
    name: "Unit A",
    billIds: ["electricity"],
    fixedBillShares: { electricity: 400 },
  });
  it("uses the default amount and deducts unit fixed shares", () => {
    const result = buildReport({
      bills: [fixed],
      properties: [building, unitA],
      entries: [],
    });

    const line = result.buildings[0].lines[0];
    expect(line.invoiceAmount).toBe(1500);
    expect(line.charges).toHaveLength(1);
    expect(line.charges[0].unit.id).toBe("unit-a");
    expect(line.charges[0].amount).toBe(400);
    expect(line.coveredAmount).toBe(400);
    expect(line.ownerAmount).toBe(1100);
    expect(result.buildings[0].ownerNet).toBe(1100);
    expect(result.totals).toMatchObject({
      gross: 1500,
      tenantCovered: 400,
      ownerNet: 1100,
      missingCount: 0,
    });
  });

  it("lets a monthly entry override the default amount", () => {
    const result = buildReport({
      bills: [fixed],
      properties: [building, unitA],
      entries: [entry({ amount: 1600 })],
    });

    expect(result.buildings[0].lines[0].invoiceAmount).toBe(1600);
    expect(result.buildings[0].ownerNet).toBe(1200);
  });

  it("keeps the default amount when only a payment is recorded", () => {
    const result = buildReport({
      bills: [fixed],
      properties: [building, unitA],
      entries: [
        entry({
          paidAt: "2026-11-05T10:00:00.000Z",
          paymentMode: "Maya",
          paymentDescription: "Paid via Maya",
        }),
      ],
    });

    const line = result.buildings[0].lines[0];
    expect(line.invoiceAmount).toBe(1500);
    expect(line.ownerAmount).toBe(1100);
    expect(line.entry?.paymentMode).toBe("Maya");
    expect(result.totals.ownerNet).toBe(1100);
  });

  it("keeps the share recorded even when the building amount is missing", () => {
    const noDefault = bill({
      billingType: "Fixed amount per month",
      defaultAmount: undefined,
    });
    const result = buildReport({
      bills: [noDefault],
      properties: [building, unitA],
      entries: [],
    });

    const line = result.buildings[0].lines[0];
    expect(line.missing).toBe(true);
    expect(line.charges[0].amount).toBe(400);
    expect(line.ownerAmount).toBeUndefined();
    expect(result.totals.missingCount).toBe(1);
  });

  it("shows the fixed share on the unit and marks it as read-only data", () => {
    const result = buildReport({
      bills: [fixed],
      properties: [building, unitA],
      entries: [],
    });

    const unitLine = result.buildings[0].units[0].lines[0];
    expect(unitLine.source).toBe("fixed-share");
    expect(unitLine.amount).toBe(400);
    expect(result.buildings[0].units[0].total).toBe(400);
  });

  it("shows unit photo evidence without changing the fixed share", () => {
    const result = buildReport({
      bills: [fixed],
      properties: [building, unitA],
      entries: [
        entry({
          propertyId: "unit-a",
          amount: 450,
          photoUri: "photos/unit-fixed-bill.jpg",
        }),
      ],
    });

    const unitLine = result.buildings[0].units[0].lines[0];
    expect(unitLine.photoUri).toBe("photos/unit-fixed-bill.jpg");
    expect(unitLine.amount).toBe(400);
  });
});

describe("non-metered bills", () => {
  it("never deducts fixed bills unless a unit shares it", () => {
    const fixed = bill({ billingType: "Fixed amount per month" });
    const result = buildReport({
      bills: [fixed],
      properties: [
        property({ billIds: ["electricity"] }),
        unit({
          billIds: ["electricity"],
          subMeterBillIds: ["electricity"],
        }),
      ],
      entries: [
        entry({ amount: 1500 }),
        entry({ id: "entry-unit", propertyId: "unit-1", amount: 1500 }),
      ],
    });

    expect(result.buildings[0].lines[0].coveredAmount).toBe(0);
    expect(result.buildings[0].ownerNet).toBe(1500);
  });

  it("allocates split bills equally and keeps the total cent-exact", () => {
    const split = bill({ billingType: "Split across units" });
    const result = buildReport({
      bills: [split],
      properties: [
        property({ billIds: ["electricity"] }),
        unit({ id: "unit-a", name: "A", billIds: ["electricity"] }),
        unit({ id: "unit-b", name: "B", billIds: ["electricity"] }),
        unit({ id: "unit-c", name: "C", billIds: ["electricity"] }),
      ],
      entries: [entry({ amount: 100 })],
    });

    const charges = result.buildings[0].lines[0].charges;
    expect(charges.map((charge) => charge.amount)).toEqual([
      33.34, 33.33, 33.33,
    ]);
    expect(result.buildings[0].ownerNet).toBe(0);
    expect(
      charges.reduce((total, charge) => total + (charge.amount ?? 0), 0),
    ).toBe(100);
  });

  it("allocates per-person bills using active tenants only", () => {
    const perPerson = bill({ billingType: "Per Person" });
    const result = buildReport({
      bills: [perPerson],
      properties: [
        property({ billIds: ["electricity"] }),
        unit({
          id: "unit-a",
          billIds: ["electricity"],
          tenantIds: ["t1", "t2"],
        }),
        unit({ id: "unit-b", billIds: ["electricity"], tenantIds: ["t3"] }),
      ],
      tenants: [
        tenant({ id: "t1" }),
        tenant({ id: "t2" }),
        tenant({ id: "t3", tenantStatus: "Inactive" }),
      ],
      entries: [entry({ amount: 3000 })],
    });

    const charges = result.buildings[0].lines[0].charges;
    expect(charges.map((charge) => charge.amount)).toEqual([3000, 0]);
    expect(result.buildings[0].ownerNet).toBe(0);
  });
});

describe("unit charges", () => {
  it("keeps independent unit bills separate from the building invoice", () => {
    const water = bill({ id: "water", name: "Water", utilityType: "Water" });
    const result = buildReport({
      bills: [bill(), water],
      properties: [
        property({ billIds: ["electricity"] }),
        unit({ billIds: ["electricity"] }),
        unit({ id: "unit-2", name: "Unit B", billIds: ["water"] }),
      ],
      entries: [
        entry({ reading: 100, amount: 1000 }),
        entry({ id: "e1", propertyId: "unit-1", reading: 10 }),
        entry({
          id: "e2",
          propertyId: "unit-2",
          billingItemId: "water",
          amount: 500,
        }),
      ],
    });

    const unitB = result.buildings[0].units.find(
      (item) => item.property.id === "unit-2",
    );
    expect(unitB?.lines[0].source).toBe("independent");
    expect(unitB?.total).toBe(500);
    expect(result.buildings[0].ownerNet).toBe(1000);
  });

  it("shows units without a parent building as standalone", () => {
    const result = buildReport({
      properties: [
        unit({ id: "solo", parentBuildingId: null, billIds: ["electricity"] }),
      ],
      entries: [entry({ propertyId: "solo", amount: 750 })],
    });

    expect(result.buildings).toHaveLength(0);
    expect(result.units).toHaveLength(1);
    expect(result.units[0].total).toBe(750);
  });
});

describe("one-off monthly bills", () => {
  const oneOff = bill({
    id: "repair",
    name: "Repair",
    utilityType: "Other bills",
    billingType: "Fixed amount per month",
    defaultAmount: 500,
  });

  it("adds the bill only to the selected property", () => {
    const merged = mergeMonthlyOnlyBills({
      properties: [
        property({ billIds: ["electricity"] }),
        unit({ billIds: ["electricity"] }),
      ],
      bills: [bill()],
      monthlyOnlyBills: [
        { bill: oneOff, period: "2026-11", propertyId: "unit-1" },
      ],
    });

    expect(merged.bills.map((item) => item.id)).toEqual([
      "electricity",
      "repair",
    ]);
    expect(
      merged.properties.find((item) => item.id === "building-1")?.billIds,
    ).toEqual(["electricity"]);
    expect(
      merged.properties.find((item) => item.id === "unit-1")?.billIds,
    ).toEqual(["electricity", "repair"]);
  });

  it("includes the one-off bill in the selected month's report", () => {
    const merged = mergeMonthlyOnlyBills({
      properties: [property({ billIds: [] }), unit({ billIds: [] })],
      bills: [],
      monthlyOnlyBills: [
        { bill: oneOff, period: "2026-11", propertyId: "unit-1" },
      ],
    });
    const result = buildMonthlyBillingReport({
      period: "2026-11",
      properties: merged.properties,
      bills: merged.bills,
      tenants: [],
      entries: [
        entry({
          propertyId: "unit-1",
          billingItemId: "repair",
          amount: 500,
        }),
      ],
    });

    const unitBilling = result.buildings[0].units.find(
      (item) => item.property.id === "unit-1",
    );
    expect(unitBilling?.lines).toHaveLength(1);
    expect(unitBilling?.lines[0].bill.name).toBe("Repair");
    expect(unitBilling?.total).toBe(500);
  });

  it("does not include the bill in another month", () => {
    // A different period does not load the one-off bill, so it cannot appear.
    const result = buildMonthlyBillingReport({
      period: "2026-12",
      properties: [property({ billIds: [] }), unit({ billIds: [] })],
      bills: [],
      tenants: [],
      entries: [],
    });

    expect(result.buildings[0].lines).toHaveLength(0);
    expect(result.buildings[0].units[0].lines).toHaveLength(0);
  });
});

describe("billing highlight target", () => {
  it("points at the building card that contains the unit", () => {
    const result = buildReport({
      properties: [property({ billIds: ["electricity"] }), unit()],
    });

    expect(resolveBillingHighlight(result, "unit-1")).toEqual({
      kind: "building",
      id: "building-1",
    });
  });

  it("points at a standalone unit card", () => {
    const result = buildReport({
      properties: [unit({ parentBuildingId: null })],
    });

    expect(resolveBillingHighlight(result, "unit-1")).toEqual({
      kind: "unit",
      id: "unit-1",
    });
  });

  it("returns null when the unit is missing from the report", () => {
    const result = buildReport({ properties: [property()] });

    expect(resolveBillingHighlight(result, "unit-9")).toBeNull();
  });
});
