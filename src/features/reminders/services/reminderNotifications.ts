import * as Notifications from "expo-notifications";
import {
  AndroidImportance,
  AndroidNotificationVisibility,
} from "expo-notifications/build/NotificationChannelManager.types";
import { IosAuthorizationStatus } from "expo-notifications/build/NotificationPermissions.types";
import { Platform } from "react-native";

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
 * Keeps the OS schedule in sync with the stored reminders: pending alerts for
 * edited/deleted reminders are cancelled and the next 60 occurrences across
 * every reminder are scheduled. Safe to call on every screen focus.
 */
export async function syncReminderNotifications(
  reminders: Reminder[],
): Promise<void> {
  try {
    await configureReminderNotifications();
    if (!(await hasReminderNotificationPermission())) return;

    const now = new Date();
    const upcoming = buildUpcomingReminderOccurrences(
      reminders,
      now,
      MAX_SCHEDULED,
    );
    const desiredIds = new Set(
      upcoming.map((occurrence) =>
        occurrenceId(occurrence.reminder.id, occurrence.date),
      ),
    );

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

    for (const { reminder, date } of upcoming) {
      const identifier = occurrenceId(reminder.id, date);
      if (scheduledIds.has(identifier)) continue;

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: reminder.title,
          body: reminder.notes || "It's time for your reminder.",
          sound: "default",
          data: { url: "/reminders", reminderId: reminder.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
        },
      });
    }
  } catch (error) {
    console.warn("Unable to sync reminder notifications:", error);
  }
}
