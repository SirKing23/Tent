import { useCallback, useMemo, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import { persistPhoto } from "../../../services/photoStorage";
import { shiftPeriod } from "../../../utils/period";
import { getBillingItems } from "../../bills/services/billingRepository";
import type { BillingItem } from "../../bills/types";
import { getProperties } from "../../properties/services/propertyRepository";
import type { Property } from "../../properties/types";
import { getTenants } from "../../tenants/services/tenantRepository";
import type { Tenant } from "../../tenants/types";
import {
  buildMonthlyBillingReport,
  mergeMonthlyOnlyBills,
} from "../logic/monthlyBilling";
import {
  deleteMonthlyOnlyBill as deleteMonthlyOnlyBillItem,
  getMonthlyOnlyBills,
} from "../services/monthlyBillItemsRepository";
import {
  clearMonthlyBillPayment,
  deleteMonthlyBillEntry,
  getMonthlyBillEntries,
  saveMonthlyBillEntry,
  saveMonthlyBillPayment,
} from "../services/monthlyBillingRepository";
import type {
  MonthlyBillEntry,
  MonthlyBillEntryInput,
  MonthlyBillPaymentInput,
  MonthlyOnlyBill,
} from "../types";

/** Loads everything the monthly billing report needs for one period. */
export function useMonthlyBilling(period: string) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [bills, setBills] = useState<BillingItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [entries, setEntries] = useState<MonthlyBillEntry[]>([]);
  const [monthlyOnlyBills, setMonthlyOnlyBills] = useState<MonthlyOnlyBill[]>(
    [],
  );
  const [previousEntries, setPreviousEntries] = useState<MonthlyBillEntry[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const previousPeriod = shiftPeriod(period, -1);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [
      loadedProperties,
      loadedBills,
      loadedTenants,
      loadedEntries,
      loadedMonthlyOnlyBills,
      loadedPreviousEntries,
    ] = await Promise.all([
      getProperties(),
      getBillingItems(),
      getTenants(),
      getMonthlyBillEntries(period),
      getMonthlyOnlyBills(period),
      getMonthlyBillEntries(previousPeriod),
    ]);
    setProperties(loadedProperties);
    setBills(loadedBills);
    setTenants(loadedTenants);
    setEntries(loadedEntries);
    setMonthlyOnlyBills(loadedMonthlyOnlyBills);
    setPreviousEntries(loadedPreviousEntries);
    setIsLoading(false);
  }, [period, previousPeriod]);

  useFocusReload(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const report = useMemo(() => {
    const monthlyBills = mergeMonthlyOnlyBills({
      properties,
      bills,
      monthlyOnlyBills: monthlyOnlyBills.filter(
        (item) => item.period === period,
      ),
    });
    return buildMonthlyBillingReport({
      period,
      properties: monthlyBills.properties,
      bills: monthlyBills.bills,
      tenants,
      entries,
    });
  }, [bills, entries, monthlyOnlyBills, period, properties, tenants]);

  const entryFor = useCallback(
    (propertyId: string, billingItemId: string) =>
      entries.find(
        (entry) =>
          entry.period === period &&
          entry.propertyId === propertyId &&
          entry.billingItemId === billingItemId,
      ),
    [entries, period],
  );

  const previousEntryFor = useCallback(
    (propertyId: string, billingItemId: string) =>
      previousEntries.find(
        (entry) =>
          entry.period === previousPeriod &&
          entry.propertyId === propertyId &&
          entry.billingItemId === billingItemId,
      ),
    [previousEntries, previousPeriod],
  );

  const saveEntry = useCallback(
    async (input: Omit<MonthlyBillEntryInput, "period">) => {
      const storedPhoto = await persistPhoto(input.photoUri, "meter-photo");
      await saveMonthlyBillEntry({ ...input, photoUri: storedPhoto, period });
      await refresh();
    },
    [period, refresh],
  );

  const savePayment = useCallback(
    async (input: Omit<MonthlyBillPaymentInput, "period">) => {
      const storedProof = await persistPhoto(
        input.paymentProofUri,
        "payment-proof",
      );
      await saveMonthlyBillPayment({
        ...input,
        paymentProofUri: storedProof,
        period,
      });
      await refresh();
    },
    [period, refresh],
  );

  const clearPayment = useCallback(
    async (propertyId: string, billingItemId: string) => {
      await clearMonthlyBillPayment({ period, propertyId, billingItemId });
      await refresh();
    },
    [period, refresh],
  );

  const removeEntry = useCallback(
    async (propertyId: string, billingItemId: string) => {
      await deleteMonthlyBillEntry({ period, propertyId, billingItemId });
      await refresh();
    },
    [period, refresh],
  );

  const monthlyOnlyBillIds = useMemo(
    () =>
      new Set(
        monthlyOnlyBills
          .filter((item) => item.period === period)
          .map((item) => item.bill.id),
      ),
    [monthlyOnlyBills, period],
  );

  const deleteMonthlyOnlyBill = useCallback(
    async (propertyId: string, billingItemId: string) => {
      await deleteMonthlyOnlyBillItem({ period, propertyId, billingItemId });
      await refresh();
    },
    [period, refresh],
  );

  return {
    report,
    properties,
    bills,
    tenants,
    entries,
    monthlyOnlyBills,
    entryFor,
    previousEntryFor,
    monthlyOnlyBillIds,
    isLoading,
    refresh,
    saveEntry,
    savePayment,
    clearPayment,
    removeEntry,
    deleteMonthlyOnlyBill,
  };
}
