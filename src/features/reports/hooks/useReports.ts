import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import { getBillingItems } from "../../bills/services/billingRepository";
import { getCashbookEntries } from "../../cashbooks/services/cashbookEntryRepository";
import { getCashbooks } from "../../cashbooks/services/cashbookRepository";
import { getAllMonthlyBillEntries } from "../../monthlyBilling/services/monthlyBillingRepository";
import { getAllMonthlyOnlyBills } from "../../monthlyBilling/services/monthlyBillItemsRepository";
import { getProperties } from "../../properties/services/propertyRepository";
import { getTenants } from "../../tenants/services/tenantRepository";
import { getMeterConsumptionRecords } from "../services/reportsRepository";
import type { ReportsData } from "../types";

export function useReports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        meterReadings,
        bills,
        properties,
        tenants,
        monthlyBillEntries,
        monthlyOnlyBills,
        cashbooks,
        cashbookEntries,
      ] = await Promise.all([
        getMeterConsumptionRecords(),
        getBillingItems(),
        getProperties(),
        getTenants(),
        getAllMonthlyBillEntries(),
        getAllMonthlyOnlyBills(),
        getCashbooks(),
        getCashbookEntries(),
      ]);
      setData({
        meterReadings,
        bills,
        properties,
        tenants,
        monthlyBillEntries,
        monthlyOnlyBills,
        cashbooks,
        cashbookEntries,
      });
    } catch (loadError) {
      console.error("Unable to load reports:", loadError);
      setError("Reports could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusReload(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { data, error, isLoading, refresh };
}
