import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import { getCurrentPeriod } from "../../../utils/period";
import { getBillingItems } from "../../bills/services/billingRepository";
import { getCashbookEntries } from "../../cashbooks/services/cashbookEntryRepository";
import { getCashbooks } from "../../cashbooks/services/cashbookRepository";
import {
  buildMonthlyBillingReport,
  mergeMonthlyOnlyBills,
} from "../../monthlyBilling/logic/monthlyBilling";
import { getMonthlyOnlyBills } from "../../monthlyBilling/services/monthlyBillItemsRepository";
import {
  getMonthlyBillEntries,
  saveMonthlyBillPayment,
} from "../../monthlyBilling/services/monthlyBillingRepository";
import { getProperties } from "../../properties/services/propertyRepository";
import { getRemindersForDay } from "../../reminders/logic/reminderCalendar";
import { getReminders } from "../../reminders/services/reminderRepository";
import type { Reminder } from "../../reminders/types";
import { getTenants } from "../../tenants/services/tenantRepository";
import {
  buildActivityFeed,
  buildDashboardMetrics,
  buildDashboardUnits,
  buildPaymentAlerts,
} from "../logic/dashboardData";
import type {
  ActivityEntry,
  DashboardMetrics,
  PaymentAlert,
} from "../types";

const EMPTY_METRICS: DashboardMetrics = {
  collected: 0,
  target: 0,
  pending: 0,
  progress: 0,
  occupiedUnits: 0,
  totalUnits: 0,
  occupancyRate: 0,
};

type DashboardSnapshot = {
  metrics: DashboardMetrics;
  alerts: PaymentAlert[];
  /** Reminders that occur today, earliest first, shown in the Home bell. */
  todayReminders: Reminder[];
  activity: ActivityEntry[];
  totalProperties: number;
};

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  metrics: EMPTY_METRICS,
  alerts: [],
  todayReminders: [],
  activity: [],
  totalProperties: 0,
};

/** Loads the current month's billing, cash-book, and property data for Home. */
export function useDashboard() {
  const period = getCurrentPeriod();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [
        properties,
        bills,
        tenants,
        entries,
        monthlyOnlyBills,
        cashbookEntries,
        cashbooks,
        reminders,
      ] = await Promise.all([
        getProperties(),
        getBillingItems(),
        getTenants(),
        getMonthlyBillEntries(period),
        getMonthlyOnlyBills(period),
        getCashbookEntries(),
        getCashbooks(),
        getReminders(),
      ]);

      const merged = mergeMonthlyOnlyBills({
        properties,
        bills,
        monthlyOnlyBills: monthlyOnlyBills.filter(
          (item) => item.period === period,
        ),
      });
      const report = buildMonthlyBillingReport({
        period,
        properties: merged.properties,
        bills: merged.bills,
        tenants,
        entries,
      });
      const units = buildDashboardUnits(report);
      const now = new Date();

      setSnapshot({
        metrics: buildDashboardMetrics(units),
        alerts: buildPaymentAlerts({ units, period, now }),
        todayReminders: getRemindersForDay(reminders, now),
        activity: buildActivityFeed({
          monthlyEntries: entries,
          cashbookEntries,
          cashbooks,
          properties: merged.properties,
          bills: merged.bills,
        }),
        totalProperties: properties.length,
      });
    } catch (error) {
      console.error("Unable to load dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useFocusReload(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const markPaid = useCallback(
    async (alert: PaymentAlert) => {
      const paidAt = new Date().toISOString();
      await Promise.all(
        alert.billLines.map((line) =>
          saveMonthlyBillPayment({
            period,
            propertyId: line.propertyId,
            billingItemId: line.billingItemId,
            paidAt,
          }),
        ),
      );
      await refresh();
    },
    [period, refresh],
  );

  return {
    period,
    ...snapshot,
    isLoading,
    refresh,
    markPaid,
  };
}
