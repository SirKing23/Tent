import type { BillingItem, BillingType, UtilityType } from "../bills/types";
import type { Cashbook, CashbookEntry } from "../cashbooks/types";
import type { MonthlyBillEntry, MonthlyOnlyBill } from "../monthlyBilling/types";
import type { Property } from "../properties/types";
import type { Tenant } from "../tenants/types";

export type MeterConsumptionRecord = {
  period: string;
  propertyId: string;
  propertyName: string;
  billingItemId: string;
  billName: string;
  billingType: Extract<BillingType, "Meter reading" | "Total consumption">;
  utilityType: UtilityType;
  displayUnit: string;
  reading: number;
  previousReading: number | null;
};

export type ReportsData = {
  meterReadings: MeterConsumptionRecord[];
  properties: Property[];
  bills: BillingItem[];
  tenants: Tenant[];
  monthlyBillEntries: MonthlyBillEntry[];
  monthlyOnlyBills: MonthlyOnlyBill[];
  cashbooks: Cashbook[];
  cashbookEntries: CashbookEntry[];
};
