import type { BillingItem } from "../../bills/types";
import type { Cashbook, CashbookEntry } from "../../cashbooks/types";
import type { MonthlyBillingReport, MonthlyBillEntry } from "../../monthlyBilling/types";
import type { Property } from "../../properties/types";
import { getTenantName } from "../../tenants/logic/tenantRules";
import type { Tenant } from "../../tenants/types";

import type {
  ActivityEntry,
  ActivityFilter,
  DashboardMetrics,
  DashboardUnit,
  DueStatus,
  PaymentAlert,
} from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_PATTERN = /^(\d{4})-(\d{2})$/;

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

/** Midnight of the given date, used for calendar-day comparisons. */
export const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parsePeriod = (
  period: string,
): { year: number; monthIndex: number } | null => {
  const match = PERIOD_PATTERN.exec(period);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, monthIndex: month - 1 };
};

const parseFixedDueDate = (value: string | undefined): Date | null => {
  if (!value?.trim()) return null;

  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (parts) {
    const date = new Date(
      Number(parts[3]),
      Number(parts[1]) - 1,
      Number(parts[2]),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

type DueDateSource = Pick<
  BillingItem,
  "dueDateType" | "fixedDueDate" | "recurringRule" | "recurringDay"
>;

/**
 * Resolves when a bill is due inside a `YYYY-MM` period. Recurring rules are
 * projected onto the report period; fixed dates keep their stored date.
 */
export const resolveBillDueDate = (
  bill: DueDateSource,
  period: string,
): Date | null => {
  if (bill.dueDateType === "No Due date") return null;
  if (bill.dueDateType === "Fixed date") {
    return parseFixedDueDate(bill.fixedDueDate);
  }

  const parts = parsePeriod(period);
  if (!parts) return null;

  const lastDay = new Date(parts.year, parts.monthIndex + 1, 0).getDate();
  if (bill.recurringRule === "First day of the month") {
    return new Date(parts.year, parts.monthIndex, 1);
  }
  if (bill.recurringRule === "Every last day of the month") {
    return new Date(parts.year, parts.monthIndex, lastDay);
  }

  const day = Math.min(Math.max(bill.recurringDay ?? 1, 1), lastDay);
  return new Date(parts.year, parts.monthIndex, day);
};

export const getDueStatus = (
  dueDate: Date | null,
  now: Date,
): { status: DueStatus; daysUntilDue: number | null } => {
  if (!dueDate) return { status: "none", daysUntilDue: null };

  const diffDays = Math.round(
    (startOfDay(dueDate).getTime() - startOfDay(now).getTime()) / DAY_MS,
  );

  if (diffDays < 0) return { status: "overdue", daysUntilDue: diffDays };
  if (diffDays === 0) return { status: "today", daysUntilDue: 0 };
  return { status: "upcoming", daysUntilDue: diffDays };
};

export const getDueStatusLabel = (
  status: DueStatus,
  daysUntilDue: number | null,
): string => {
  if (status === "overdue") return `Overdue ${Math.abs(daysUntilDue ?? 0)}d`;
  if (status === "today") return "Due today";
  if (status === "upcoming") return `Due in ${daysUntilDue ?? 0}d`;
  return "No due date";
};

/** Flattens a monthly billing report into units with a parent name. */
export const buildDashboardUnits = (
  report: MonthlyBillingReport,
): DashboardUnit[] => [
  ...report.buildings.flatMap((building) =>
    building.units.map((unit) => ({
      ...unit,
      parentName: building.property.name,
    })),
  ),
  ...report.units,
];

export const buildDashboardMetrics = (
  units: readonly DashboardUnit[],
): DashboardMetrics => {
  const lines = units.flatMap((unit) => unit.lines);
  const target = round2(sum(lines.map((line) => line.amount ?? 0)));
  const collected = round2(
    sum(lines.filter((line) => line.paidAt).map((line) => line.amount ?? 0)),
  );
  const pending = round2(Math.max(0, target - collected));
  const totalUnits = units.length;
  const occupiedUnits = units.filter((unit) =>
    unit.tenants.some((tenant) => tenant.tenantStatus === "Active"),
  ).length;

  return {
    collected,
    target,
    pending,
    progress: target > 0 ? Math.min(1, collected / target) : 0,
    occupiedUnits,
    totalUnits,
    occupancyRate:
      totalUnits > 0
        ? Math.round((occupiedUnits / totalUnits) * 1000) / 10
        : 0,
  };
};

const statusRank: Record<DueStatus, number> = {
  overdue: 0,
  today: 1,
  upcoming: 2,
  none: 3,
};

/**
 * Builds one alert per occupied unit that still has unpaid bills. The amount
 * is the unit's outstanding total and the due date is the earliest unpaid bill.
 */
export const buildPaymentAlerts = ({
  units,
  period,
  now,
}: {
  units: readonly DashboardUnit[];
  period: string;
  now: Date;
}): PaymentAlert[] => {
  const alerts: PaymentAlert[] = [];

  for (const unit of units) {
    const activeTenants = unit.tenants.filter(
      (tenant) => tenant.tenantStatus === "Active",
    );
    if (activeTenants.length === 0) continue;

    const unpaidLines = unit.lines.filter(
      (line) => (line.amount ?? 0) > 0 && !line.paidAt,
    );
    if (unpaidLines.length === 0) continue;

    const dueDates = unpaidLines
      .map((line) => resolveBillDueDate(line.bill, period))
      .filter((date): date is Date => Boolean(date));
    const dueDate = dueDates.length
      ? new Date(Math.min(...dueDates.map((date) => date.getTime())))
      : null;
    const { status, daysUntilDue } = getDueStatus(dueDate, now);
    const primaryTenant: Tenant = activeTenants[0];

    alerts.push({
      id: unit.property.id,
      unitId: unit.property.id,
      unitLabel: unit.property.name,
      propertyName: unit.parentName ?? "Standalone unit",
      tenantName: getTenantName(primaryTenant),
      tenantPhone: primaryTenant.phone,
      amount: round2(
        sum(unpaidLines.map((line) => line.amount ?? 0)),
      ),
      dueDate,
      status,
      daysUntilDue,
      billLines: unpaidLines.map((line) => ({
        propertyId: unit.property.id,
        billingItemId: line.bill.id,
      })),
    });
  }

  return alerts.sort(
    (a, b) =>
      statusRank[a.status] - statusRank[b.status] ||
      (a.daysUntilDue ?? Number.MAX_SAFE_INTEGER) -
        (b.daysUntilDue ?? Number.MAX_SAFE_INTEGER) ||
      b.amount - a.amount,
  );
};

/**
 * Merges cash-book movements and monthly bill rows into one newest-first feed.
 * Bill rows without an amount are payment-only records and are skipped.
 */
export const buildActivityFeed = ({
  monthlyEntries,
  cashbookEntries,
  cashbooks,
  properties,
  bills,
  limit = 12,
}: {
  monthlyEntries: readonly MonthlyBillEntry[];
  cashbookEntries: readonly CashbookEntry[];
  cashbooks: readonly Cashbook[];
  properties: readonly Property[];
  bills: readonly BillingItem[];
  limit?: number;
}): ActivityEntry[] => {
  const cashbooksById = new Map(
    cashbooks.map((cashbook) => [cashbook.id, cashbook]),
  );
  const propertiesById = new Map(
    properties.map((property) => [property.id, property]),
  );
  const billsById = new Map(bills.map((bill) => [bill.id, bill]));
  const activity: ActivityEntry[] = [];

  for (const entry of cashbookEntries) {
    const occurredAt = entry.createdAt || entry.date;
    if (!occurredAt) continue;

    activity.push({
      id: `cashbook-${entry.id}`,
      kind: "cashbook",
      title:
        entry.description.trim() ||
        (entry.type === "cashIn" ? "Cash in" : "Cash out"),
      tag: cashbooksById.get(entry.cashbookId)?.title ?? "Cash notebook",
      amount: entry.amount,
      direction: entry.type === "cashIn" ? "in" : "out",
      occurredAt,
    });
  }

  for (const entry of monthlyEntries) {
    if (entry.amount === undefined || entry.amount === null) continue;

    const bill = billsById.get(entry.billingItemId);
    const property = propertiesById.get(entry.propertyId);
    const paid = Boolean(entry.paidAt);

    activity.push({
      id: `bill-${entry.id}`,
      kind: "bill",
      title: bill
        ? `${bill.name} ${paid ? "paid" : "bill"}`
        : paid
          ? "Bill paid"
          : "Bill recorded",
      tag: property?.name ?? "Property",
      amount: entry.amount,
      direction: paid ? "in" : "pending",
      occurredAt: entry.paidAt ?? entry.createdAt,
    });
  }

  return activity
    .filter((item) => !Number.isNaN(new Date(item.occurredAt).getTime()))
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, limit);
};

export const filterActivity = (
  activity: readonly ActivityEntry[],
  filter: ActivityFilter,
): ActivityEntry[] =>
  filter === "all"
    ? [...activity]
    : activity.filter((item) => item.kind === filter);

export const formatRelativeTime = (
  value: string,
  now = new Date(),
): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
};

export const getGreeting = (now = new Date()): string => {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

/** `2026-11` → `November` */
export const getMonthLabel = (period: string): string => {
  const parts = parsePeriod(period);
  if (!parts) return period;
  return new Date(parts.year, parts.monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
  });
};
