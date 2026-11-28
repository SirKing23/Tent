import {
  buildPropertyRecord,
  countChildUnits,
  countPropertiesByType,
  filterProperties,
  getPropertyAddress,
  partitionPropertyIdsByChildUnits,
  propertyToDraft,
  resolvePropertySummary,
  validatePropertyInfoStep,
} from "../propertyRules";
import type { Property } from "../../types";

const property = (overrides: Partial<Property> = {}): Property => ({
  id: "property-1",
  name: "Sunrise Building",
  type: "Building",
  parentBuildingId: null,
  street: "1 Rizal St",
  street2: "",
  barangay: "Poblacion",
  city: "Makati",
  province: "Metro Manila",
  zipCode: "1200",
  country: "Philippines",
  photos: [],
  billIds: [],
  subMeterBillIds: [],
  fixedBillShares: {},
  tenantIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("getPropertyAddress", () => {
  it("joins the available address parts", () => {
    expect(getPropertyAddress(property())).toBe(
      "1 Rizal St, Poblacion, Makati, Metro Manila",
    );
    expect(getPropertyAddress(null)).toBe("");
  });
});

describe("filterProperties", () => {
  const building = property();
  const unit = property({
    id: "unit-1",
    name: "Unit A",
    type: "Unit",
    parentBuildingId: building.id,
    street: "",
    street2: "",
    barangay: "",
    city: "",
    province: "",
  });

  it("filters by type", () => {
    expect(
      filterProperties([building, unit], { query: "", type: "Unit" }).map(
        (item) => item.id,
      ),
    ).toEqual(["unit-1"]);
  });

  it("matches the parent building's name when searching", () => {
    expect(
      filterProperties([building, unit], {
        query: "sunrise",
        type: "all",
      }).map((item) => item.id),
    ).toEqual(["property-1", "unit-1"]);
  });

  it("returns everything for a blank query and no type filter", () => {
    expect(
      filterProperties([building, unit], { query: " ", type: "all" }),
    ).toHaveLength(2);
  });
});

describe("counts and delete guards", () => {
  const building = property();
  const unit = property({
    id: "unit-1",
    type: "Unit",
    parentBuildingId: building.id,
  });
  const emptyBuilding = property({ id: "property-2", name: "Empty" });
  const properties = [building, unit, emptyBuilding];

  it("counts types and child units", () => {
    expect(countPropertiesByType(properties)).toEqual({
      buildings: 2,
      units: 1,
      total: 3,
    });
    expect(countChildUnits(properties, building.id)).toBe(1);
    expect(countChildUnits(properties, emptyBuilding.id)).toBe(0);
  });

  it("blocks buildings that still have units", () => {
    expect(
      partitionPropertyIdsByChildUnits(properties, [
        building.id,
        emptyBuilding.id,
      ]),
    ).toEqual({
      blocked: [building.id],
      deletable: [emptyBuilding.id],
    });
  });
});

describe("validatePropertyInfoStep", () => {
  const base = {
    name: "Unit A",
    type: "Unit" as const,
    parentBuildingId: "building-1",
    street: "2 Mabini",
    street2: "",
    city: "Pasig",
    province: "Metro Manila",
  };

  it("accepts a complete unit draft", () => {
    expect(validatePropertyInfoStep(base)).toEqual({ valid: true });
  });

  it("requires name, core address fields, and a parent for units", () => {
    expect(validatePropertyInfoStep({ ...base, name: " " })).toMatchObject({
      valid: false,
      title: "Missing field",
      message: "Please enter a Property Name.",
    });
    expect(validatePropertyInfoStep({ ...base, city: "" })).toMatchObject({
      valid: false,
      title: "Missing address",
    });
    expect(
      validatePropertyInfoStep({ ...base, parentBuildingId: null }),
    ).toMatchObject({
      valid: false,
      message: "Please select the Building this unit belongs to.",
    });
  });
});

describe("record building", () => {
  it("trims text, defaults the country, and prunes stale sub-meters", () => {
    const record = buildPropertyRecord({
      id: "unit-1",
      draft: {
        ...propertyToDraft(
          property({ id: "unit-1", type: "Unit", parentBuildingId: "building-1" }),
        ),
        name: "  Unit A  ",
        country: "  ",
        billIds: ["consumption"],
        subMeterBillIds: ["consumption", "missing"],
      },
      persistedPhotos: ["photos/unit-a.jpg"],
      bills: [
        {
          id: "consumption",
          name: "Electricity",
          utilityType: "Electricity",
          billingType: "Meter reading",
          displayUnit: "",
          dueDateType: "No Due date",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      parentBillIds: ["consumption"],
      createdAt: "2026-02-01T00:00:00.000Z",
    });

    expect(record).toMatchObject({
      id: "unit-1",
      name: "Unit A",
      country: "Philippines",
      photos: ["photos/unit-a.jpg"],
      subMeterBillIds: ["consumption"],
      createdAt: "2026-02-01T00:00:00.000Z",
    });
  });

  it("keeps only fixed shares on units for linked fixed bills", () => {
    const fixed = {
      id: "fixed",
      name: "Caretaker",
      utilityType: "Other bills" as const,
      billingType: "Fixed amount per month" as const,
      displayUnit: "",
      dueDateType: "No Due date" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const meter = {
      id: "meter",
      name: "Electricity",
      utilityType: "Electricity" as const,
      billingType: "Meter reading" as const,
      displayUnit: "kWh",
      dueDateType: "Recurring monthly" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const record = buildPropertyRecord({
      id: "unit-1",
      draft: {
        ...propertyToDraft(
          property({
            id: "unit-1",
            type: "Unit",
            parentBuildingId: "building-1",
          }),
        ),
        billIds: ["fixed", "meter"],
        fixedBillShares: { fixed: 400, meter: 100, missing: 50 },
      },
      persistedPhotos: [],
      bills: [fixed, meter],
      parentBillIds: ["fixed", "meter"],
      createdAt: "2026-02-01T00:00:00.000Z",
    });

    expect(record.fixedBillShares).toEqual({ fixed: 400 });

    const buildingRecord = buildPropertyRecord({
      id: "building-1",
      draft: {
        ...propertyToDraft(property()),
        billIds: ["fixed"],
        fixedBillShares: { fixed: 400 },
      },
      persistedPhotos: [],
      bills: [fixed],
      parentBillIds: ["fixed"],
      createdAt: "2026-02-01T00:00:00.000Z",
    });

    expect(buildingRecord.fixedBillShares).toEqual({});
  });
});

describe("resolvePropertySummary", () => {
  it("returns linked bills, tenants, and the parent building", () => {
    const parent = property();
    const unit = property({
      id: "unit-1",
      type: "Unit",
      parentBuildingId: parent.id,
      billIds: ["bill-1"],
      tenantIds: ["tenant-1"],
      photos: ["photos/a.jpg"],
    });

    const summary = resolvePropertySummary({
      property: unit,
      bills: [
        {
          id: "bill-1",
          name: "Electricity",
          utilityType: "Electricity",
          billingType: "Meter reading",
          displayUnit: "",
          dueDateType: "No Due date",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      tenants: [
        {
          id: "tenant-1",
          tenantStatus: "Active",
          photo: null,
          firstName: "Ana",
          middleName: "",
          lastName: "Cruz",
          phone: "09170000000",
          email: "",
          idType: "SSS ID",
          idNumber: "1",
          idPhoto: null,
        },
      ],
      buildings: [parent],
    });

    expect(summary.photos).toEqual(["photos/a.jpg"]);
    expect(summary.linkedBills.map((bill) => bill.id)).toEqual(["bill-1"]);
    expect(summary.linkedTenants.map((tenant) => tenant.id)).toEqual([
      "tenant-1",
    ]);
    expect(summary.parentBuilding?.id).toBe(parent.id);
  });

  it("handles a missing property", () => {
    expect(
      resolvePropertySummary({
        property: null,
        bills: [],
        tenants: [],
        buildings: [],
      }),
    ).toEqual({
      photos: [],
      linkedBills: [],
      linkedTenants: [],
      parentBuilding: undefined,
    });
  });
});
