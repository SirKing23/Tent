import type { UnitMonthlyBilling } from "../monthlyBilling/types";

/** A unit with the name of its parent building resolved for display. */
export type DashboardUnit = UnitMonthlyBilling & {
  parentName?: string;
};

export type DueStatus = "overdue" | "today" | "upcoming" | "none";

export type PaymentAlert = {
  id: string;
  unitId: string;
  unitLabel: string;
  propertyName: string;
  tenantName: string;
  tenantPhone: string;
  amount: number;
  dueDate: Date | null;
  status: DueStatus;
  daysUntilDue: number | null;
  /** Unpaid unit bill lines that make up `amount`. */
  billLines: { propertyId: string; billingItemId: string }[];
};

export type DashboardMetrics = {
  collected: number;
  target: number;
  pending: number;
  /** 0–1 collection progress against the monthly target. */
  progress: number;
  occupiedUnits: number;
  totalUnits: number;
  /** Percentage with one decimal, e.g. `87.5`. */
  occupancyRate: number;
};

export type ActivityKind = "cashbook" | "bill";
export type ActivityDirection = "in" | "out" | "pending";
export type ActivityFilter = "all" | ActivityKind;

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  title: string;
  tag: string;
  amount: number;
  direction: ActivityDirection;
  occurredAt: string;
};
