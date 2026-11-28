import { getBillingItems } from "../../bills/services/billingRepository";
import { syncReminderNotifications } from "./reminderNotifications";
import { getReminders } from "./reminderRepository";

/**
 * Re-schedules every device alert from the database: manual reminders and the
 * reminders configured on bills. Call it after anything that can change either
 * list, so a bill saved from its own form schedules its alerts immediately.
 */
export async function syncAllReminderAlerts(): Promise<void> {
  try {
    const [reminders, bills] = await Promise.all([
      getReminders(),
      getBillingItems(),
    ]);
    await syncReminderNotifications(reminders, bills);
  } catch (error) {
    console.warn("Unable to refresh reminder alerts:", error);
  }
}
