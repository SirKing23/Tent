import type { PaymentMode } from "../../../constants/payments";
import type { BillingItem } from "../../bills/types";
import type { Property } from "../../properties/types";
import type { Tenant } from "../../tenants/types";

/** A billing item created for one property and one `YYYY-MM` period only. */
export type MonthlyOnlyBill = {
  period: string;
  propertyId: string;
  bill: BillingItem;
};

/** Amounts captured for one property/bill in one `YYYY-MM` period. */
export type MonthlyBillEntry = {
  id: string;
  period: string;
  propertyId: string;
  billingItemId: string;
  reading?: number;
  previousReading?: number;
  amount?: number;
  photoUri?: string;
  paidAt?: string;
  paymentMode?: PaymentMode;
  paymentDescription?: string;
  paymentProofUri?: string;
  note: string;
  createdAt: string;
};

export type MonthlyBillPaymentInput = {
  period: string;
  propertyId: string;
  billingItemId: string;
  paidAt?: string | null;
  paymentMode?: PaymentMode | null;
  paymentDescription?: string | null;
  paymentProofUri?: string | null;
};

export type MonthlyBillEntryInput = {
  period: string;
  propertyId: string;
  billingItemId: string;
  reading?: number;
  previousReading?: number | null;
  amount?: number;
  photoUri?: string | null;
  note?: string;
};

export type UnitBillSource =
  | "sub-meter"
  | "fixed-share"
  | "split"
  | "per-person"
  | "independent";

export type UnitBillChargeStatus =
  | "recorded"
  | "missing-reading"
  | "missing-rate"
  | "missing-invoice";

/** A tenant-facing charge produced by a building bill. */
export type UnitBillCharge = {
  unit: Property;
  tenants: Tenant[];
  reading?: number;
  previousReading?: number;
  consumption?: number;
  amount?: number;
  photoUri?: string;
  status: UnitBillChargeStatus;
};

export type BuildingBillLine = {
  bill: BillingItem;
  entry?: MonthlyBillEntry;
  invoiceAmount?: number;
  reading?: number;
  previousReading?: number;
  consumption?: number;
  rate?: number;
  charges: UnitBillCharge[];
  coveredAmount: number;
  ownerAmount?: number;
  missing: boolean;
};

export type UnitBillLine = {
  bill: BillingItem;
  source: UnitBillSource;
  reading?: number;
  previousReading?: number;
  consumption?: number;
  amount?: number;
  photoUri?: string;
  paidAt?: string;
  paymentMode?: PaymentMode;
  paymentDescription?: string;
  paymentProofUri?: string;
  status: "recorded" | "missing";
};

export type UnitMonthlyBilling = {
  property: Property;
  tenants: Tenant[];
  lines: UnitBillLine[];
  total: number;
  /** Missing amounts for bills that are not already counted on a building line. */
  missingCount: number;
};

export type BuildingMonthlyBilling = {
  property: Property;
  lines: BuildingBillLine[];
  units: UnitMonthlyBilling[];
  gross: number;
  tenantCovered: number;
  ownerNet: number;
  missingCount: number;
  hasOverDeduction: boolean;
};

export type MonthlyBillingReport = {
  period: string;
  buildings: BuildingMonthlyBilling[];
  units: UnitMonthlyBilling[];
  totals: {
    gross: number;
    tenantCovered: number;
    ownerNet: number;
    missingCount: number;
    paidCount: number;
    unpaidCount: number;
  };
};
