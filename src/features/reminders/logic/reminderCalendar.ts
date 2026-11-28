import { DEFAULT_REMINDER_HOUR } from "../../../constants/reminders";
import type { ValidationResult } from "../../../types/validation";
import { createTimestampId } from "../../../utils/id";
import type { Reminder, ReminderDraft } from "../types";

export const startOfDay = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const startOfMonth = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), 1);

export const addDays = (value: Date, days: number): Date => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

/** Moves a date by whole months, clamped to the first day of that month. */
export const addMonths = (value: Date, months: number): Date =>
  new Date(value.getFullYear(), value.getMonth() + months, 1);

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isSameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Same day-of-month (clamped to the month's length) inside another month. */
export const moveToMonth = (current: Date, month: Date): Date => {
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  return new Date(
    month.getFullYear(),
    month.getMonth(),
    Math.min(current.getDate(), daysInMonth),
  );
};

/**
 * Six Sunday-first weeks covering `month`, including the leading/trailing
 * days of the neighbouring months so the grid never shifts.
 */
export const getMonthGrid = (month: Date): Date[] => {
  const first = startOfMonth(month);
  const gridStart = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
};

/** `new Date(2026, 10, 1)` → `November 2026` */
export const formatMonthYear = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

/** `new Date(2026, 10, 21, 9, 5)` → `9:05 AM` */
export const formatTimeLabel = (date: Date): string =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** `new Date(2026, 10, 21)` → `Sat, Nov 21` */
export const formatShortDateLabel = (date: Date): string =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

/** Whether a reminder shows up on `day` (its start day or a repeat match). */
export const reminderOccursOnDay = (reminder: Reminder, day: Date): boolean => {
  const first = new Date(reminder.remindAt);
  if (Number.isNaN(first.getTime())) return false;

  const target = startOfDay(day);
  const start = startOfDay(first);
  if (target.getTime() < start.getTime()) return false;

  switch (reminder.repeat) {
    case "daily":
      return true;
    case "weekly":
      return target.getDay() === start.getDay();
    case "monthly":
      return target.getDate() === start.getDate();
    default:
      return target.getTime() === start.getTime();
  }
};

const getMinutesOfDay = (date: Date): number =>
  date.getHours() * 60 + date.getMinutes();

/** Reminders scheduled for a single day, earliest first. */
export const getRemindersForDay = (
  reminders: Reminder[],
  day: Date,
): Reminder[] =>
  reminders
    .filter((reminder) => reminderOccursOnDay(reminder, day))
    .sort(
      (a, b) =>
        getMinutesOfDay(new Date(a.remindAt)) -
        getMinutesOfDay(new Date(b.remindAt)),
    );

export const countRemindersForDay = (
  reminders: Reminder[],
  day: Date,
): number =>
  reminders.reduce(
    (total, reminder) => total + (reminderOccursOnDay(reminder, day) ? 1 : 0),
    0,
  );

/**
 * The next `limit` alert times for a reminder, starting after `from`.
 * Repeating reminders stop at a one-year horizon so the loop always ends.
 */
export const getUpcomingOccurrences = (
  reminder: Reminder,
  from: Date,
  limit: number,
): Date[] => {
  if (limit <= 0) return [];

  const first = new Date(reminder.remindAt);
  if (Number.isNaN(first.getTime())) return [];
  if (reminder.repeat === "none") {
    return first.getTime() > from.getTime() ? [first] : [];
  }

  const hour = first.getHours();
  const minute = first.getMinutes();
  const horizon = addDays(startOfMonth(from), 395);
  const occurrences: Date[] = [];

  for (
    let cursor = startOfDay(from);
    cursor.getTime() <= horizon.getTime() && occurrences.length < limit;
    cursor = addDays(cursor, 1)
  ) {
    if (!reminderOccursOnDay(reminder, cursor)) continue;
    const occurrence = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate(),
      hour,
      minute,
    );
    if (occurrence.getTime() <= from.getTime()) continue;
    occurrences.push(occurrence);
  }

  return occurrences;
};

export type ReminderOccurrence = { reminder: Reminder; date: Date };

/** Soonest occurrences across every reminder, used to schedule alerts. */
export const buildUpcomingReminderOccurrences = (
  reminders: Reminder[],
  from: Date,
  limit: number,
): ReminderOccurrence[] =>
  reminders
    .flatMap((reminder) =>
      getUpcomingOccurrences(reminder, from, limit).map((date) => ({
        reminder,
        date,
      })),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);

/** Builds the persisted record, keeping the id/createdAt when editing. */
export const buildReminder = (
  draft: ReminderDraft,
  existing?: Reminder,
): Reminder => ({
  id: existing?.id ?? createTimestampId(),
  title: draft.title.trim(),
  notes: draft.notes.trim(),
  remindAt: draft.date.toISOString(),
  repeat: draft.repeat,
  createdAt: existing?.createdAt ?? new Date().toISOString(),
});

export const validateReminderDraft = (
  draft: ReminderDraft,
): ValidationResult => {
  if (!draft.title.trim()) {
    return {
      valid: false,
      title: "Add a title",
      message: "Give this reminder a short title so you know what it is for.",
    };
  }
  if (Number.isNaN(draft.date.getTime())) {
    return {
      valid: false,
      title: "Invalid date",
      message: "Choose a valid date and time for this reminder.",
    };
  }
  return { valid: true };
};

/** Keeps the current time while taking the date from a date picker value. */
export const mergeDatePart = (current: Date, picked: Date): Date =>
  new Date(
    picked.getFullYear(),
    picked.getMonth(),
    picked.getDate(),
    current.getHours(),
    current.getMinutes(),
  );

/** Keeps the current date while taking the time from a time picker value. */
export const mergeTimePart = (current: Date, picked: Date): Date =>
  new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate(),
    picked.getHours(),
    picked.getMinutes(),
  );

/**
 * Default time for a freshly opened editor: `DEFAULT_REMINDER_HOUR` on another
 * day, or the next hour (same day) when the selected day is today.
 */
export const getDefaultReminderDate = (
  day: Date,
  now: Date = new Date(),
): Date => {
  const target = startOfDay(day);

  if (!isSameDay(target, now)) {
    return new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
      DEFAULT_REMINDER_HOUR,
      0,
    );
  }

  const minutes = Math.min(
    now.getHours() * 60 + now.getMinutes() + 60,
    23 * 60 + 55,
  );
  return new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
  );
};

export const daysWithReminders = (
  reminders: Reminder[],
  days: Date[],
  extraCountForDay?: (day: Date) => number,
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const day of days) {
    const count =
      countRemindersForDay(reminders, day) + (extraCountForDay?.(day) ?? 0);
    if (count > 0) counts.set(day.toDateString(), count);
  }
  return counts;
};
