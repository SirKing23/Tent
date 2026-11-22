import { isSubMeterEligible } from "../../bills/logic/billingRules";
import type { BillingItem } from "../../bills/types";
import type { Property } from "../../properties/types";
import type { Tenant } from "../../tenants/types";

import type {
  BuildingBillLine,
  BuildingMonthlyBilling,
  MonthlyBillEntry,
  MonthlyBillingReport,
  MonthlyOnlyBill,
  UnitBillCharge,
  UnitBillLine,
  UnitBillSource,
  UnitBillingSummary,
  UnitMonthlyBilling,
} from "../types";

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const sum = (values: readonly (number | undefined)[]): number =>
  values.reduce<number>((total, value) => total + (value ?? 0), 0);

const entryKey = (propertyId: string, billingItemId: string): string =>
  `${propertyId}::${billingItemId}`;

/** Splits an amount into cent-exact equal shares. */
export const distributeEqualShares = (
  total: number,
  count: number,
): number[] => {
  if (count <= 0) return [];
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from(
    { length: count },
    (_, index) => (base + (index < remainder ? 1 : 0)) / 100,
  );
};

/** Splits an amount per person, then multiplies by each unit's tenant count. */
export const distributePerPerson = (
  total: number,
  tenantCounts: readonly number[],
): number[] => {
  const persons = tenantCounts.reduce((sumValue, count) => sumValue + count, 0);
  if (persons <= 0) return tenantCounts.map(() => 0);

  const totalCents = Math.round(total * 100);
  const perPersonCents = Math.floor(totalCents / persons);
  let remainder = totalCents - perPersonCents * persons;

  return tenantCounts.map((count) => {
    let cents = perPersonCents * count;
    const extra = Math.min(remainder, count);
    cents += extra;
    remainder -= extra;
    return cents / 100;
  });
};

/** Collapses the unit billings of a building into list-header totals. */
export const summarizeUnitBilling = (
  units: readonly UnitMonthlyBilling[],
): UnitBillingSummary => {
  const lines = units.flatMap((unit) => unit.lines);
  const paidCount = lines.filter((line) => Boolean(line.paidAt)).length;
  return {
    unitCount: units.length,
    billCount: lines.length,
    paidCount,
    unpaidCount: lines.length - paidCount,
    total: round2(sum(units.map((unit) => unit.total))),
  };
};

/** Consumption is shown to two decimals to avoid floating-point artifacts. */
export const roundConsumption = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * For `Meter reading` bills, `reading` is the current meter value and
 * consumption is `reading − previousReading`. Other types store consumption
 * directly in `reading`.
 */
export const getConsumption = (
  bill: Pick<BillingItem, "billingType">,
  entry: Pick<MonthlyBillEntry, "reading" | "previousReading"> | undefined,
): number | undefined => {
  if (!entry || entry.reading === undefined) return undefined;
  if (bill.billingType !== "Meter reading") return entry.reading;

  const previous = entry.previousReading ?? 0;
  return entry.reading >= previous
    ? roundConsumption(entry.reading - previous)
    : undefined;
};

/** Previous reading for a new month: last month's current reading, else `0`. */
export const suggestPreviousReading = (
  previousEntry: Pick<MonthlyBillEntry, "reading"> | undefined,
): number => previousEntry?.reading ?? 0;

const getTenants = (
  property: Property,
  tenantsById: ReadonlyMap<string, Tenant>,
): Tenant[] =>
  property.tenantIds
    .map((tenantId) => tenantsById.get(tenantId))
    .filter((tenant): tenant is Tenant => Boolean(tenant));

const getUnitSource = (bill: BillingItem): UnitBillSource => {
  if (isSubMeterEligible(bill.billingType)) return "sub-meter";
  if (bill.billingType === "Fixed amount per month") return "fixed-share";
  if (bill.billingType === "Split across units") return "split";
  if (bill.billingType === "Per Person") return "per-person";
  return "independent";
};

const buildUnitBilling = ({
  unit,
  billsById,
  tenantsById,
  entriesByKey,
  coveredLines,
}: {
  unit: Property;
  billsById: ReadonlyMap<string, BillingItem>;
  tenantsById: ReadonlyMap<string, Tenant>;
  entriesByKey: ReadonlyMap<string, MonthlyBillEntry>;
  coveredLines: ReadonlyMap<string, UnitBillLine>;
}): UnitMonthlyBilling => {
  const lines: UnitBillLine[] = [];

  for (const billId of unit.billIds) {
    const bill = billsById.get(billId);
    if (!bill) continue;

    const entry = entriesByKey.get(entryKey(unit.id, billId));
    const payment = {
      paidAt: entry?.paidAt,
      paymentMode: entry?.paymentMode,
      paymentDescription: entry?.paymentDescription,
      paymentProofUri: entry?.paymentProofUri,
    };

    const covered = coveredLines.get(billId);
    if (covered) {
      lines.push({ ...covered, ...payment });
      continue;
    }

    const amount = entry?.amount;
    lines.push({
      bill,
      source: "independent",
      reading: entry?.reading,
      previousReading: entry?.previousReading,
      consumption: getConsumption(bill, entry),
      amount,
      photoUri: entry?.photoUri,
      ...payment,
      status: amount !== undefined ? "recorded" : "missing",
    });
  }

  const missingCount = lines.filter(
    (line) => line.source === "independent" && line.status === "missing",
  ).length;

  return {
    property: unit,
    tenants: getTenants(unit, tenantsById),
    lines,
    total: round2(sum(lines.map((line) => line.amount))),
    missingCount,
  };
};

const buildUnitCharges = ({
  bill,
  invoiceAmount,
  units,
  tenantsById,
  entriesByKey,
  rate,
}: {
  bill: BillingItem;
  invoiceAmount: number | undefined;
  units: readonly Property[];
  tenantsById: ReadonlyMap<string, Tenant>;
  entriesByKey: ReadonlyMap<string, MonthlyBillEntry>;
  rate: number | undefined;
}): UnitBillCharge[] => {
  if (bill.billingType === "Split across units") {
    const shares =
      invoiceAmount !== undefined
        ? distributeEqualShares(invoiceAmount, units.length)
        : [];
    return units.map((unit, index) => ({
      unit,
      tenants: getTenants(unit, tenantsById),
      amount: shares[index],
      status: invoiceAmount !== undefined ? "recorded" : "missing-invoice",
    }));
  }

  if (bill.billingType === "Per Person") {
    const counts = units.map(
      (unit) =>
        getTenants(unit, tenantsById).filter(
          (tenant) => tenant.tenantStatus === "Active",
        ).length,
    );
    const shares =
      invoiceAmount !== undefined
        ? distributePerPerson(invoiceAmount, counts)
        : [];
    return units.map((unit, index) => ({
      unit,
      tenants: getTenants(unit, tenantsById),
      amount: invoiceAmount !== undefined ? shares[index] : undefined,
      status: invoiceAmount !== undefined ? "recorded" : "missing-invoice",
    }));
  }

  return units.map((unit) => {
    const entry = entriesByKey.get(entryKey(unit.id, bill.id));
    const reading = entry?.reading;
    const previousReading = entry?.previousReading;
    const consumption = getConsumption(bill, entry);

    if (entry?.amount !== undefined) {
      return {
        unit,
        tenants: getTenants(unit, tenantsById),
        reading,
        previousReading,
        consumption,
        amount: entry.amount,
        photoUri: entry.photoUri,
        status: "recorded",
      };
    }
    if (consumption !== undefined && rate !== undefined) {
      return {
        unit,
        tenants: getTenants(unit, tenantsById),
        reading,
        previousReading,
        consumption,
        amount: round2(consumption * rate),
        photoUri: entry?.photoUri,
        status: "recorded",
      };
    }
    return {
      unit,
      tenants: getTenants(unit, tenantsById),
      reading,
      previousReading,
      consumption,
      photoUri: entry?.photoUri,
      status:
        reading === undefined
          ? "missing-reading"
          : invoiceAmount === undefined
            ? "missing-invoice"
            : "missing-rate",
    };
  });
};

const buildBuildingBilling = ({
  building,
  units,
  billsById,
  tenantsById,
  entriesByKey,
}: {
  building: Property;
  units: readonly Property[];
  billsById: ReadonlyMap<string, BillingItem>;
  tenantsById: ReadonlyMap<string, Tenant>;
  entriesByKey: ReadonlyMap<string, MonthlyBillEntry>;
}): BuildingMonthlyBilling => {
  const lines: BuildingBillLine[] = [];
  const coveredByUnit = new Map<string, Map<string, UnitBillLine>>();

  for (const billId of building.billIds) {
    const bill = billsById.get(billId);
    if (!bill) continue;

    const entry = entriesByKey.get(entryKey(building.id, bill.id));
    const invoiceAmount =
      entry?.amount ??
      (bill.billingType === "Fixed amount per month"
        ? bill.defaultAmount
        : undefined);
    const reading = entry?.reading;
    const previousReading = entry?.previousReading;
    const consumption = getConsumption(bill, entry);
    const metered = isSubMeterEligible(bill.billingType);
    const rate =
      metered &&
      invoiceAmount !== undefined &&
      consumption !== undefined &&
      consumption > 0
        ? invoiceAmount / consumption
        : undefined;

    let charges: UnitBillCharge[] = [];
    if (metered) {
      const targets = units.filter(
        (unit) =>
          unit.billIds.includes(bill.id) &&
          unit.subMeterBillIds.includes(bill.id),
      );
      charges = buildUnitCharges({
        bill,
        invoiceAmount,
        units: targets,
        tenantsById,
        entriesByKey,
        rate,
      });
    } else if (bill.billingType === "Fixed amount per month") {
      const targets = units.filter(
        (unit) =>
          unit.billIds.includes(bill.id) &&
          unit.fixedBillShares[bill.id] !== undefined,
      );
      charges = targets.map((unit) => ({
        unit,
        tenants: getTenants(unit, tenantsById),
        amount: unit.fixedBillShares[bill.id],
        status: "recorded",
      }));
    } else if (
      bill.billingType === "Split across units" ||
      bill.billingType === "Per Person"
    ) {
      const targets = units.filter((unit) => unit.billIds.includes(bill.id));
      charges = buildUnitCharges({
        bill,
        invoiceAmount,
        units: targets,
        tenantsById,
        entriesByKey,
        rate,
      });
    }

    const coveredAmount = round2(sum(charges.map((charge) => charge.amount)));
    const ownerAmount =
      invoiceAmount !== undefined
        ? round2(invoiceAmount - coveredAmount)
        : undefined;

    const source = getUnitSource(bill);
    for (const charge of charges) {
      const unitLines = coveredByUnit.get(charge.unit.id) ?? new Map();
      unitLines.set(bill.id, {
        bill,
        source,
        reading: charge.reading,
        previousReading: charge.previousReading,
        consumption: charge.consumption,
        amount: charge.amount,
        photoUri: charge.photoUri,
        status: charge.amount !== undefined ? "recorded" : "missing",
      });
      coveredByUnit.set(charge.unit.id, unitLines);
    }

    lines.push({
      bill,
      entry,
      invoiceAmount,
      reading,
      previousReading,
      consumption,
      rate,
      charges,
      coveredAmount,
      ownerAmount,
      missing: invoiceAmount === undefined,
    });
  }

  const unitBillings = units.map((unit) =>
    buildUnitBilling({
      unit,
      billsById,
      tenantsById,
      entriesByKey,
      coveredLines: coveredByUnit.get(unit.id) ?? new Map(),
    }),
  );

  const gross = round2(sum(lines.map((line) => line.invoiceAmount)));
  const tenantCovered = round2(
    sum(lines.map((line) => line.coveredAmount)),
  );

  return {
    property: building,
    lines,
    units: unitBillings,
    unitSummary: summarizeUnitBilling(unitBillings),
    gross,
    tenantCovered,
    ownerNet: round2(gross - tenantCovered),
    missingCount:
      lines.filter((line) => line.missing).length +
      lines.reduce(
        (total, line) =>
          total +
          line.charges.filter((charge) => charge.status !== "recorded").length,
        0,
      ),
    hasOverDeduction: lines.some((line) => (line.ownerAmount ?? 0) < 0),
  };
};

/**
 * Adds one-off bills to only the property and month they were created for.
 * Normal bills keep their existing links and are left untouched.
 */
export const mergeMonthlyOnlyBills = ({
  properties,
  bills,
  monthlyOnlyBills,
}: {
  properties: readonly Property[];
  bills: readonly BillingItem[];
  monthlyOnlyBills: readonly MonthlyOnlyBill[];
}): { properties: Property[]; bills: BillingItem[] } => {
  const extraBillIdsByProperty = new Map<string, string[]>();
  for (const item of monthlyOnlyBills) {
    const ids = extraBillIdsByProperty.get(item.propertyId) ?? [];
    ids.push(item.bill.id);
    extraBillIdsByProperty.set(item.propertyId, ids);
  }

  const mergedBills = [...bills];
  const knownBillIds = new Set(mergedBills.map((bill) => bill.id));
  for (const item of monthlyOnlyBills) {
    if (knownBillIds.has(item.bill.id)) continue;
    knownBillIds.add(item.bill.id);
    mergedBills.push(item.bill);
  }

  const mergedProperties = properties.map((property) => {
    const extraIds = extraBillIdsByProperty.get(property.id);
    if (!extraIds?.length) return property;
    return {
      ...property,
      billIds: [...new Set([...property.billIds, ...extraIds])],
    };
  });

  return { properties: mergedProperties, bills: mergedBills };
};

/**
 * Builds the monthly billing report for one period.
 *
 * Metered bills use the building's rate (invoice ÷ reading) to price each
 * sub-metered unit. Split and per-person bills allocate the building invoice
 * across units. Fixed bills never reduce the building invoice.
 */
export const buildMonthlyBillingReport = ({
  period,
  properties,
  bills,
  tenants,
  entries,
}: {
  period: string;
  properties: readonly Property[];
  bills: readonly BillingItem[];
  tenants: readonly Tenant[];
  entries: readonly MonthlyBillEntry[];
}): MonthlyBillingReport => {
  const billsById = new Map(bills.map((bill) => [bill.id, bill]));
  const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const entriesByKey = new Map(
    entries
      .filter((entry) => entry.period === period)
      .map((entry) => [
        entryKey(entry.propertyId, entry.billingItemId),
        entry,
      ]),
  );

  const buildings = properties.filter(
    (property) => property.type === "Building",
  );
  const buildingIds = new Set(buildings.map((building) => building.id));
  const units = properties.filter((property) => property.type === "Unit");
  const childUnitsOf = (buildingId: string) =>
    units.filter((unit) => unit.parentBuildingId === buildingId);

  const buildingReports = buildings.map((building) =>
    buildBuildingBilling({
      building,
      units: childUnitsOf(building.id),
      billsById,
      tenantsById,
      entriesByKey,
    }),
  );

  const standaloneUnits = units
    .filter(
      (unit) =>
        !unit.parentBuildingId || !buildingIds.has(unit.parentBuildingId),
    )
    .map((unit) =>
      buildUnitBilling({
        unit,
        billsById,
        tenantsById,
        entriesByKey,
        coveredLines: new Map(),
      }),
    );

  const gross = round2(
    sum(buildingReports.map((building) => building.gross)),
  );
  const tenantCovered = round2(
    sum(buildingReports.map((building) => building.tenantCovered)),
  );

  const buildingLines = buildingReports.flatMap((building) => building.lines);
  const unitLines = [
    ...buildingReports.flatMap((building) =>
      building.units.flatMap((unit) => unit.lines),
    ),
    ...standaloneUnits.flatMap((unit) => unit.lines),
  ];
  const paidCount =
    buildingLines.filter((line) => Boolean(line.entry?.paidAt)).length +
    unitLines.filter((line) => Boolean(line.paidAt)).length;
  const billCount = buildingLines.length + unitLines.length;

  return {
    period,
    buildings: buildingReports,
    units: standaloneUnits,
    totals: {
      gross,
      tenantCovered,
      ownerNet: round2(gross - tenantCovered),
      missingCount:
        buildingReports.reduce(
          (total, building) =>
            total +
            building.missingCount +
            building.units.reduce(
              (unitTotal, unit) => unitTotal + unit.missingCount,
              0,
            ),
          0,
        ) +
        standaloneUnits.reduce(
          (total, unit) => total + unit.missingCount,
          0,
        ),
      paidCount,
      unpaidCount: billCount - paidCount,
    },
  };
};
