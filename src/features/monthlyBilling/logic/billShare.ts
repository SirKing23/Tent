import type { BillingItem } from "../../bills/types";
import { resolveBillDueDate } from "../../dashboard/logic/dashboardData";
import type { Property } from "../../properties/types";
import { getTenantName } from "../../tenants/logic/tenantRules";
import type { Tenant } from "../../tenants/types";
import { formatDateMDY } from "../../../utils/date";
import type {
  BuildingBillLine,
  BuildingMonthlyBilling,
  UnitMonthlyBilling,
} from "../types";

/** One utility line as shown on the shareable invoice. */
export type ShareableBill = {
  id: string;
  name: string;
  utilityType: BillingItem["utilityType"];
  displayUnit: string;
  amount?: number;
  dueDate?: string;
  reading?: number;
  previousReading?: number;
  consumption?: number;
  /** Price per unit computed from the building's invoice, when applicable. */
  rate?: number;
};

export type BillShareTarget = {
  kind: "building" | "unit";
  property: Property;
  period: string;
  recipients: string[];
  bills: ShareableBill[];
};

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const activeTenantNames = (tenants: readonly Tenant[]): string[] =>
  tenants
    .filter((tenant) => tenant.tenantStatus === "Active")
    .map((tenant) => getTenantName(tenant))
    .filter(Boolean);

const resolveDueDate = (
  bill: BillingItem,
  period: string,
): string | undefined => {
  const dueDate = resolveBillDueDate(bill, period);
  return dueDate ? formatDateMDY(dueDate) : undefined;
};

const toShareableBill = (
  line: Pick<
    BuildingBillLine,
    "bill" | "reading" | "previousReading" | "consumption"
  > & { amount?: number; rate?: number },
  period: string,
): ShareableBill => ({
  id: line.bill.id,
  name: line.bill.name,
  utilityType: line.bill.utilityType,
  displayUnit: line.bill.displayUnit,
  amount: line.amount,
  dueDate: resolveDueDate(line.bill, period),
  reading: line.reading,
  previousReading: line.previousReading,
  consumption: line.consumption,
  rate: line.rate,
});

export const buildBuildingShareTarget = ({
  billing,
  period,
  tenants,
}: {
  billing: BuildingMonthlyBilling;
  period: string;
  tenants: readonly Tenant[];
}): BillShareTarget => {
  const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const linkedTenants = billing.property.tenantIds
    .map((tenantId) => tenantsById.get(tenantId))
    .filter((tenant): tenant is Tenant => Boolean(tenant));

  return {
    kind: "building",
    property: billing.property,
    period,
    recipients: activeTenantNames(linkedTenants),
    bills: billing.lines.map((line) =>
      toShareableBill({ ...line, amount: line.invoiceAmount }, period),
    ),
  };
};

/**
 * A unit is billed with the building's rate per unit, so the invoice a tenant
 * receives has to show it. `ratesByBillId` carries the building line's rate.
 */
export const buildUnitShareTarget = ({
  unit,
  period,
  ratesByBillId,
}: {
  unit: UnitMonthlyBilling;
  period: string;
  ratesByBillId?: ReadonlyMap<string, number | undefined>;
}): BillShareTarget => ({
  kind: "unit",
  property: unit.property,
  period,
  recipients: activeTenantNames(unit.tenants),
  bills: unit.lines.map((line) =>
    toShareableBill(
      { ...line, rate: ratesByBillId?.get(line.bill.id) },
      period,
    ),
  ),
});

/** Utilities with a recorded amount are checked by default. */
export const getDefaultShareSelection = (target: BillShareTarget): string[] =>
  target.bills
    .filter((bill) => bill.amount !== undefined)
    .map((bill) => bill.id);

export const getSelectedBills = (
  target: BillShareTarget,
  selectedIds: readonly string[],
): ShareableBill[] =>
  target.bills.filter((bill) => selectedIds.includes(bill.id));

export const getInvoiceTotal = (bills: readonly ShareableBill[]): number =>
  round2(bills.reduce((total, bill) => total + (bill.amount ?? 0), 0));
