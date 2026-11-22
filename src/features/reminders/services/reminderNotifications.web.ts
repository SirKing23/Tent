import type { Reminder } from "../types";

/**
 * Web stub: browsers have no local scheduled notifications through
 * `expo-notifications`, so the calendar still works without device alerts.
 */
export const REMINDER_ALERTS_SUPPORTED = false;

export async function configureReminderNotifications(): Promise<void> {}

export async function hasReminderNotificationPermission(): Promise<boolean> {
  return false;
}

export async function requestReminderNotificationPermission(): Promise<boolean> {
  return false;
}

export async function syncReminderNotifications(
  _reminders: Reminder[],
): Promise<void> {}
