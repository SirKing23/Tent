import type { BillingItem } from "../../../bills/types";
import type { Property } from "../../../properties/types";
import type { Tenant } from "../../../tenants/types";
import type {
  BuildingBillLine,
  BuildingMonthlyBilling,
  UnitBillLine,
  UnitMonthlyBilling,
} from "../../types";
import {
  buildBuildingShareTarget,
  buildUnitShareTarget,
  getDefaultShareSelection,
  getInvoiceTotal,
  getSelectedBills,
} from "../billShare";

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

const buildingLine = (
  overrides: Partial<BuildingBillLine> = {},
): BuildingBillLine => ({
  bill: bill(),
  invoiceAmount: 2400,
  reading: 1320,
  previousReading: 1200,
  consumption: 120,
  charges: [],
  coveredAmount: 0,
  missing: false,
  ...overrides,
});

const buildingBilling = (
  overrides: Partial<BuildingMonthlyBilling> = {},
): BuildingMonthlyBilling => ({
  property: property(),
  lines: [],
  units: [],
  unitSummary: {
    unitCount: 0,
    billCount: 0,
    paidCount: 0,
    unpaidCount: 0,
    total: 0,
  },
  gross: 0,
  tenantCovered: 0,
  ownerNet: 0,
  missingCount: 0,
  hasOverDeduction: false,
  ...overrides,
});

const unitLine = (overrides: Partial<UnitBillLine> = {}): UnitBillLine => ({
  bill: bill(),
  source: "fixed-share",
  amount: 999,
  status: "recorded",
  ...overrides,
});

const unitBilling = (
  overrides: Partial<UnitMonthlyBilling> = {},
): UnitMonthlyBilling => ({
  property: property({
    id: "unit-1",
    name: "Unit A",
    type: "Unit",
    parentBuildingId: "building-1",
  }),
  tenants: [],
  lines: [],
  total: 0,
  missingCount: 0,
  ...overrides,
});

describe("buildBuildingShareTarget", () => {
  const activeTenant = tenant();
  const inactiveTenant = tenant({
    id: "tenant-2",
    tenantStatus: "Inactive",
    firstName: "Ben",
    lastName: "Diaz",
  });
  const waterBill = bill({
    id: "water",
    name: "Water",
    utilityType: "Water",
    dueDateType: "No Due date",
    recurringRule: undefined,
    recurringDay: undefined,
  });
  const target = buildBuildingShareTarget({
    billing: buildingBilling({
      property: property({ tenantIds: [activeTenant.id, inactiveTenant.id] }),
      lines: [
        buildingLine(),
        buildingLine({
          bill: waterBill,
          invoiceAmount: undefined,
          reading: undefined,
          previousReading: undefined,
          consumption: undefined,
          missing: true,
        }),
      ],
    }),
    period: "2026-11",
    tenants: [activeTenant, inactiveTenant],
  });

  it("maps the building invoice amount, due date, and reading", () => {
    expect(target.bills[0]).toMatchObject({
      id: "electricity",
      amount: 2400,
      dueDate: "11/15/2026",
      reading: 1320,
      previousReading: 1200,
      consumption: 120,
    });
  });

  it("carries the computed rate per unit", () => {
    const withRate = buildBuildingShareTarget({
      billing: buildingBilling({
        lines: [buildingLine({ rate: 20 })],
      }),
      period: "2026-11",
      tenants: [],
    });

    expect(withRate.bills[0].rate).toBe(20);
  });

  it("keeps unrecorded utilities available for display", () => {
    expect(target.bills[1]).toMatchObject({
      id: "water",
      amount: undefined,
      dueDate: undefined,
    });
  });

  it("addresses active tenants only", () => {
    expect(target.recipients).toEqual(["Ana Cruz"]);
  });

  it("selects recorded utilities by default and totals them", () => {
    expect(getDefaultShareSelection(target)).toEqual(["electricity"]);
    expect(getInvoiceTotal(getSelectedBills(target, ["electricity"]))).toBe(
      2400,
    );
  });
});

describe("buildUnitShareTarget", () => {
  const activeTenant = tenant();
  const inactiveTenant = tenant({
    id: "tenant-2",
    tenantStatus: "Inactive",
    firstName: "Ben",
    lastName: "Diaz",
  });
  const target = buildUnitShareTarget({
    unit: unitBilling({
      property: property({
        id: "unit-1",
        name: "Unit A",
        type: "Unit",
        parentBuildingId: "building-1",
        tenantIds: [activeTenant.id, inactiveTenant.id],
      }),
      tenants: [activeTenant, inactiveTenant],
      lines: [
        unitLine({
          bill: bill({
            id: "internet",
            name: "Internet",
            utilityType: "Internet",
            dueDateType: "No Due date",
            recurringRule: undefined,
            recurringDay: undefined,
          }),
        }),
        unitLine({
          bill: bill(),
          amount: undefined,
          status: "missing",
        }),
      ],
    }),
    period: "2026-11",
  });

  it("maps unit charges and recipients", () => {
    expect(target.recipients).toEqual(["Ana Cruz"]);
    expect(target.bills[0]).toMatchObject({
      id: "internet",
      amount: 999,
      dueDate: undefined,
    });
    expect(target.bills[1]).toMatchObject({
      id: "electricity",
      amount: undefined,
    });
  });

  it("selects only utilities with an amount", () => {
    expect(getDefaultShareSelection(target)).toEqual(["internet"]);
    expect(getInvoiceTotal(getSelectedBills(target, ["internet"]))).toBe(999);
    expect(getInvoiceTotal(getSelectedBills(target, []))).toBe(0);
  });

  it("prints the building rate on the tenant's invoice", () => {
    const withRates = buildUnitShareTarget({
      unit: unitBilling({
        lines: [unitLine({ bill: bill(), amount: 750 })],
      }),
      period: "2026-11",
      ratesByBillId: new Map([["electricity", 25]]),
    });

    expect(withRates.bills[0]).toMatchObject({
      id: "electricity",
      amount: 750,
      rate: 25,
    });
  });

  it("leaves the rate empty when the building has no invoice yet", () => {
    expect(target.bills[0].rate).toBeUndefined();
  });
});
