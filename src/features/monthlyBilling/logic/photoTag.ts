import { isSubMeterEligible } from "../../bills/logic/billingRules";
import type { BillingItem } from "../../bills/types";
import type { Property } from "../../properties/types";
import type {
  MonthlyBillEntryMode,
  MonthlyBillEntryTarget,
} from "../components/MonthlyBillEntryModal";
import type { MonthlyBillEntry, MonthlyOnlyBill } from "../types";
import {
  getBillDefaultAmount,
  getConsumption,
  mergeMonthlyOnlyBills,
  suggestPreviousReading,
} from "./monthlyBilling";

/** One property and the bills a captured photo can be tagged to. */
export type PhotoTagOption = {
  property: Property;
  bills: BillingItem[];
};

/**
 * Properties with the bills they carry for one month, buildings first.
 * Bills created for that month only are included via their temporary link.
 */
export function buildPhotoTagOptions({
  properties,
  bills,
  monthlyOnlyBills,
  period,
}: {
  properties: readonly Property[];
  bills: readonly BillingItem[];
  monthlyOnlyBills: readonly MonthlyOnlyBill[];
  period: string;
}): PhotoTagOption[] {
  const merged = mergeMonthlyOnlyBills({
    properties,
    bills,
    monthlyOnlyBills: monthlyOnlyBills.filter((item) => item.period === period),
  });
  const billsById = new Map(merged.bills.map((bill) => [bill.id, bill]));

  const toOption = (property: Property): PhotoTagOption => ({
    property,
    bills: property.billIds
      .map((billId) => billsById.get(billId))
      .filter((bill): bill is BillingItem => Boolean(bill)),
  });

  return [
    ...merged.properties
      .filter((property) => property.type === "Building")
      .map(toOption),
    ...merged.properties
      .filter((property) => property.type === "Unit")
      .map(toOption),
  ];
}

/**
 * Opens the matching entry form for a bill: buildings record the invoice
 * (amount + reading), metered units record a sub-meter reading priced with the
 * building rate, and every other bill records an amount.
 */
export function buildPhotoTagTarget({
  property,
  bill,
  photoUri,
  entry,
  previousEntry,
  parentEntry,
}: {
  property: Property;
  bill: BillingItem;
  photoUri?: string;
  entry?: MonthlyBillEntry;
  previousEntry?: MonthlyBillEntry;
  parentEntry?: MonthlyBillEntry;
}): MonthlyBillEntryTarget {
  const metered = isSubMeterEligible(bill.billingType);
  const mode: MonthlyBillEntryMode = !metered
    ? "amount"
    : property.type === "Building"
      ? "invoice"
      : "reading";

  const consumption =
    metered && parentEntry ? getConsumption(bill, parentEntry) : undefined;
  const rate =
    property.type === "Unit" &&
    parentEntry?.amount !== undefined &&
    consumption !== undefined &&
    consumption > 0
      ? parentEntry.amount / consumption
      : undefined;

  return {
    property,
    bill,
    mode,
    photoOnly:
      property.type === "Unit" &&
      property.fixedBillShares[bill.id] !== undefined,
    entry,
    initialPhotoUri: photoUri,
    rate,
    amountSuggestion: entry?.amount ?? getBillDefaultAmount(bill),
    previousReadingSuggestion: suggestPreviousReading(previousEntry),
  };
}
