import * as Notifications from "expo-notifications";
import {
  AndroidImportance,
  AndroidNotificationVisibility,
} from "expo-notifications/build/NotificationChannelManager.types";
import { IosAuthorizationStatus } from "expo-notifications/build/NotificationPermissions.types";
import { Platform } from "react-native";

import {
  buildUpcomingBillReminderOccurrences,
  describeBillReminderAlert,
} from "../../bills/logic/billReminders";
import type { BillingItem } from "../../bills/types";
import { buildUpcomingReminderOccurrences } from "../logic/reminderCalendar";
import type { Reminder } from "../types";

/** Local alerts need a native runtime; the screen shows a hint on web. */
export const REMINDER_ALERTS_SUPPORTED = true;

const CHANNEL_ID = "reminders";
const NOTIFICATION_PREFIX = "reminder-";
/** iOS keeps at most 64 pending local notifications per app. */
const MAX_SCHEDULED = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const isGranted = (
  settings: Notifications.NotificationPermissionsStatus,
): boolean =>
  settings.granted ||
  settings.ios?.status === IosAuthorizationStatus.PROVISIONAL;

const occurrenceId = (reminderId: string, date: Date): string =>
  `${NOTIFICATION_PREFIX}${reminderId}-${date.getTime()}`;

const billOccurrenceId = (
  billId: string,
  offset: number,
  date: Date,
): string => `${NOTIFICATION_PREFIX}bill-${billId}-${offset}-${date.getTime()}`;

type ReminderAlert = {
  id: string;
  title: string;
  body: string;
  date: Date;
};

/** Manual reminders and bill reminders in one ordered list. */
const buildAlerts = (
  reminders: readonly Reminder[],
  bills: readonly BillingItem[],
  from: Date,
): ReminderAlert[] => {
  const manual = buildUpcomingReminderOccurrences(
    [...reminders],
    from,
    MAX_SCHEDULED,
  )
    .map(({ reminder, date }) => ({
      id: occurrenceId(reminder.id, date),
      title: reminder.title,
      body: reminder.notes || "It's time for your reminder.",
      date,
    }));

  const billAlerts = buildUpcomingBillReminderOccurrences({
    bills,
    from,
    limit: MAX_SCHEDULED,
  }).map((occurrence) => ({
    id: billOccurrenceId(
      occurrence.bill.id,
      occurrence.slot.offset,
      occurrence.date,
    ),
    ...describeBillReminderAlert(occurrence),
    date: occurrence.date,
  }));

  return [...manual, ...billAlerts]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_SCHEDULED);
};

/** Channel setup runs once per app run so a rejecting device API isn't retried. */
let androidChannelConfigured = false;

export async function configureReminderNotifications(): Promise<void> {
  if (Platform.OS !== "android" || androidChannelConfigured) return;
  androidChannelConfigured = true;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Reminders",
      description: "Alerts for property and billing reminders",
      importance: AndroidImportance.MAX,
      enableVibrate: true,
      vibrationPattern: [0, 400, 200, 400],
      enableLights: true,
      lightColor: "#059669",
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
  } catch (error) {
    // Some Android builds reject channel calls even though the channel is
    // created. Alerts still work: the native builder creates its own fallback
    // channel when the requested one is missing.
    console.warn("Unable to configure the reminder notification channel:", error);
  }
}

/** @internal Resets the cached channel state so tests start clean. */
export function resetReminderNotificationChannel(): void {
  androidChannelConfigured = false;
}

export async function hasReminderNotificationPermission(): Promise<boolean> {
  try {
    return isGranted(await Notifications.getPermissionsAsync());
  } catch (error) {
    console.warn("Unable to read notification permission:", error);
    return false;
  }
}

/** Prompts once; returns whether reminders are allowed to alert the device. */
export async function requestReminderNotificationPermission(): Promise<boolean> {
  try {
    await configureReminderNotifications();
    const current = await Notifications.getPermissionsAsync();
    if (isGranted(current)) return true;
    if (!current.canAskAgain) return false;

    const next = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return isGranted(next);
  } catch (error) {
    console.warn("Unable to request notification permission:", error);
    return false;
  }
}

/**
 * Keeps the OS schedule in sync with the stored reminders and bill reminders:
 * pending alerts for edited/deleted entries are cancelled and the next 60
 * occurrences are scheduled. Safe to call on every screen focus.
 */
export async function syncReminderNotifications(
  reminders: Reminder[],
  bills: readonly BillingItem[] = [],
): Promise<void> {
  try {
    await configureReminderNotifications();
    if (!(await hasReminderNotificationPermission())) return;

    const now = new Date();
    const upcoming = buildAlerts(reminders, bills, now);
    const desiredIds = new Set(upcoming.map((alert) => alert.id));

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduled.map((item) => item.identifier));

    await Promise.all(
      scheduled
        .filter(
          (item) =>
            item.identifier.startsWith(NOTIFICATION_PREFIX) &&
            !desiredIds.has(item.identifier),
        )
        .map((item) =>
          Notifications.cancelScheduledNotificationAsync(
            item.identifier,
          ).catch(() => undefined),
        ),
    );

    for (const alert of upcoming) {
      if (scheduledIds.has(alert.id)) continue;

      await Notifications.scheduleNotificationAsync({
        identifier: alert.id,
        content: {
          title: alert.title,
          body: alert.body,
          sound: "default",
          // Both kinds open the Reminders page, which links to the bill.
          data: { url: "/reminders" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: alert.date,
          channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
        },
      });
    }
  } catch (error) {
    console.warn("Unable to sync reminder notifications:", error);
  }
}
