import type { ReminderRepeat } from "../features/reminders/types";

export const REMINDER_REPEATS = [
  "none",
  "daily",
  "weekly",
  "monthly",
] as const satisfies readonly ReminderRepeat[];

export const REMINDER_REPEAT_LABELS: Record<ReminderRepeat, string> = {
  none: "Never",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** Short labels used by the calendar header (Sunday-first to match the grid). */
export const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/** Fallback time for reminders created for another day. */
export const DEFAULT_REMINDER_HOUR = 9;
