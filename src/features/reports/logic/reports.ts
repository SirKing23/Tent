import type { BillingItem } from "../../bills/types";
import type { Cashbook, CashbookEntry } from "../../cashbooks/types";
import type { MonthlyBillEntry, MonthlyOnlyBill } from "../../monthlyBilling/types";
import {
  buildMonthlyBillingReport,
  getConsumption,
  mergeMonthlyOnlyBills,
} from "../../monthlyBilling/logic/monthlyBilling";
import type { Property } from "../../properties/types";
import type { Tenant } from "../../tenants/types";
import { getCurrentPeriod, shiftPeriod } from "../../../utils/period";
import type { MeterConsumptionRecord } from "../types";

export type MeterReportOption = Pick<
  MeterConsumptionRecord,
  | "propertyId"
  | "propertyName"
  | "billingItemId"
  | "billName"
  | "utilityType"
  | "displayUnit"
>;

export type MonthlyReportPoint = {
  period: string;
  primary: number;
  secondary: number;
};

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const isValidPeriod = (period: string): boolean => {
  const [year, month] = period.split("-").map(Number);
  return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
};

const getPeriodRange = (periods: readonly string[], count: number): string[] => {
  const latestPeriod = periods
    .filter(isValidPeriod)
    .sort()
    .at(-1);
  if (!latestPeriod || count <= 0) return [];

  const endPeriod =
    latestPeriod > getCurrentPeriod() ? getCurrentPeriod() : latestPeriod;
  return Array.from({ length: count }, (_, index) =>
    shiftPeriod(endPeriod, index - count + 1),
  );
};

const meterOptionKey = (
  item: Pick<MeterConsumptionRecord, "propertyId" | "billingItemId">,
): string => `${item.propertyId}::${item.billingItemId}`;

export const getMeterReportOptions = (
  records: readonly MeterConsumptionRecord[],
): MeterReportOption[] => {
  const options = new Map<string, MeterReportOption>();
  for (const record of records) {
    const key = meterOptionKey(record);
    if (!options.has(key)) {
      options.set(key, {
        propertyId: record.propertyId,
        propertyName: record.propertyName,
        billingItemId: record.billingItemId,
        billName: record.billName,
        utilityType: record.utilityType,
        displayUnit: record.displayUnit,
      });
    }
  }
  return [...options.values()].sort(
    (first, second) =>
      first.propertyName.localeCompare(second.propertyName) ||
      first.billName.localeCompare(second.billName),
  );
};

export const buildMeterConsumptionHistory = (
  records: readonly MeterConsumptionRecord[],
  propertyId: string,
  billingItemId: string,
  count = 12,
): MonthlyReportPoint[] => {
  const selectedRecords = records.filter(
    (record) =>
      record.propertyId === propertyId &&
      record.billingItemId === billingItemId,
  );
  const valuesByPeriod = new Map<string, number>();

  for (const record of selectedRecords) {
    const consumption = getConsumption(
      { billingType: record.billingType },
      {
        reading: record.reading,
        previousReading: record.previousReading ?? undefined,
      },
    );
    if (consumption === undefined || !Number.isFinite(consumption) || consumption < 0) {
      continue;
    }
    valuesByPeriod.set(
      record.period,
      round2((valuesByPeriod.get(record.period) ?? 0) + consumption),
    );
  }

  return getPeriodRange(
    selectedRecords.map((record) => record.period),
    count,
  ).map((period) => ({
    period,
    primary: valuesByPeriod.get(period) ?? 0,
    secondary: 0,
  }));
};

export const buildBillingHistory = ({
  properties,
  bills,
  tenants,
  entries,
  monthlyOnlyBills,
  count = 12,
}: {
  properties: readonly Property[];
  bills: readonly BillingItem[];
  tenants: readonly Tenant[];
  entries: readonly MonthlyBillEntry[];
  monthlyOnlyBills: readonly MonthlyOnlyBill[];
  count?: number;
}): MonthlyReportPoint[] => {
  const periods = [
    ...new Set([
      ...entries.map((entry) => entry.period),
      ...monthlyOnlyBills.map((item) => item.period),
    ]),
  ];

  return getPeriodRange(periods, count).map((period) => {
    const monthBills = monthlyOnlyBills.filter(
      (item) => item.period === period,
    );
    const merged = mergeMonthlyOnlyBills({
      properties: [...properties],
      bills: [...bills],
      monthlyOnlyBills: monthBills,
    });
    const report = buildMonthlyBillingReport({
      period,
      properties: merged.properties,
      bills: merged.bills,
      tenants: [...tenants],
      entries: [...entries],
    });

    let billed = 0;
    let paid = 0;
    const addLine = (amount: number | undefined, paidAt: string | undefined) => {
      if (amount === undefined) return;
      billed += amount;
      if (paidAt) paid += amount;
    };

    for (const building of report.buildings) {
      for (const line of building.lines) {
        addLine(line.invoiceAmount, line.entry?.paidAt);
      }
      for (const unit of building.units) {
        for (const line of unit.lines) {
          if (line.source === "independent") {
            addLine(line.amount, line.paidAt);
          }
        }
      }
    }
    for (const unit of report.units) {
      for (const line of unit.lines) addLine(line.amount, line.paidAt);
    }

    return {
      period,
      primary: round2(billed),
      secondary: round2(paid),
    };
  });
};

const getPeriodFromDate = (dateValue: string): string | undefined => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return undefined;
  return getCurrentPeriod(date);
};

export const buildCashbookHistory = (
  cashbooks: readonly Cashbook[],
  entries: readonly CashbookEntry[],
  count = 12,
): MonthlyReportPoint[] => {
  const registeredIds = new Set(cashbooks.map((cashbook) => cashbook.id));
  const totalsByPeriod = new Map<string, { cashIn: number; cashOut: number }>();

  for (const entry of entries) {
    if (!registeredIds.has(entry.cashbookId)) continue;
    const period = getPeriodFromDate(entry.date);
    if (!period) continue;

    const totals = totalsByPeriod.get(period) ?? { cashIn: 0, cashOut: 0 };
    if (entry.type === "cashIn") totals.cashIn += entry.amount;
    else totals.cashOut += entry.amount;
    totalsByPeriod.set(period, totals);
  }

  return getPeriodRange([...totalsByPeriod.keys()], count).map((period) => {
    const totals = totalsByPeriod.get(period) ?? { cashIn: 0, cashOut: 0 };
    return {
      period,
      primary: round2(totals.cashIn),
      secondary: round2(totals.cashOut),
    };
  });
};

export const getMeterReportOptionKey = meterOptionKey;
