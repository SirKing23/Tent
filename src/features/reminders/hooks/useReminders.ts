import { useCallback, useRef, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import { getBillingItems } from "../../bills/services/billingRepository";
import type { BillingItem } from "../../bills/types";
import {
  deleteReminderRecord,
  getReminders,
  saveReminderRecord,
} from "../services/reminderRepository";
import { syncReminderNotifications } from "../services/reminderNotifications";
import type { Reminder } from "../types";

/** Reminder list state: load on focus, persist edits, and mirror device alerts. */
export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  // Bills carry their own reminders; the page lists them beside manual ones.
  const [bills, setBills] = useState<BillingItem[]>([]);
  const billsRef = useRef<BillingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async (): Promise<Reminder[]> => {
    const [loaded, loadedBills] = await Promise.all([
      getReminders(),
      getBillingItems(),
    ]);
    setReminders(loaded);
    billsRef.current = loadedBills;
    setBills(loadedBills);
    setIsLoading(false);
    return loaded;
  }, []);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  useFocusReload(
    useCallback(() => {
      void (async () => {
        const loaded = await load();
        void syncReminderNotifications(loaded, billsRef.current);
      })();
    }, [load]),
  );

  const save = useCallback(
    async (reminder: Reminder) => {
      setIsSaving(true);
      try {
        await saveReminderRecord(reminder);
        const loaded = await load();
        void syncReminderNotifications(loaded, billsRef.current);
      } finally {
        setIsSaving(false);
      }
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteReminderRecord(id);
      const loaded = await load();
      void syncReminderNotifications(loaded, billsRef.current);
    },
    [load],
  );

  return { reminders, bills, isLoading, isSaving, refresh, save, remove };
}
