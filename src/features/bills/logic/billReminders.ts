import { resolveBillDueDate } from "../../dashboard/logic/dashboardData";
import { getCurrentPeriod } from "../../../utils/period";
import type {
  BillReminderOffset,
  BillReminderSettings,
  BillReminderSlot,
  BillingItem,
} from "../types";

/** Offsets offered in the bill form, longest lead first. */
export const BILL_REMINDER_OPTIONS: readonly {
  offset: BillReminderOffset;
  label: string;
}[] = [
  { offset: 2, label: "2 days before" },
  { offset: 1, label: "1 day before" },
  { offset: 0, label: "On the due date" },
];

export const DEFAULT_REMINDER_TIME = "09:00";

export const billReminderSlotLabel = (offset: BillReminderOffset): string =>
  BILL_REMINDER_OPTIONS.find((option) => option.offset === offset)?.label ??
  `${offset} days before`;

/** How far ahead upcoming occurrences are generated for scheduling. */
export const BILL_REMINDER_HORIZON_DAYS = 120;

export type BillReminderOccurrence = {
  bill: BillingItem;
  slot: BillReminderSlot;
  dueDate: Date;
  /** When the alert fires: due date minus the slot's offset, at its time. */
  date: Date;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const startOfDay = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isValidReminderTime = (time: string): boolean =>
  TIME_PATTERN.test(time.trim());

const getTimeParts = (
  time: string,
): { hours: number; minutes: number } | null => {
  const match = TIME_PATTERN.exec(time.trim());
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
};

/** `"09:30"` → `"9:30 AM"`; invalid values fall back to the raw text. */
export const formatReminderTime = (time: string): string => {
  const parts = getTimeParts(time);
  if (!parts) return time;
  return new Date(2000, 0, 1, parts.hours, parts.minutes).toLocaleTimeString(
    "en-US",
    { hour: "numeric", minute: "2-digit" },
  );
};

/** Parses the JSON stored on the bill; malformed values disable reminders. */
export function parseBillReminder(
  raw: string | null | undefined,
): BillReminderSettings | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return undefined;
    const slots = (parsed as { slots?: unknown }).slots;
    if (!Array.isArray(slots)) return undefined;

    const valid: BillReminderSlot[] = [];
    for (const slot of slots) {
      if (!slot || typeof slot !== "object") continue;
      const { offset, time } = slot as { offset?: unknown; time?: unknown };
      if (offset !== 0 && offset !== 1 && offset !== 2) continue;
      if (typeof time !== "string" || !isValidReminderTime(time)) continue;
      valid.push({ offset, time: time.trim() });
    }

    return valid.length > 0 ? { slots: valid } : undefined;
  } catch {
    return undefined;
  }
}

export function serializeBillReminder(
  settings: BillReminderSettings | undefined,
): string | null {
  if (!settings?.slots.length) return null;
  return JSON.stringify({ slots: settings.slots });
}

/** Builds the stored settings from the form's per-offset times. */
export function buildBillReminder(
  times: Partial<Record<BillReminderOffset, string>>,
): BillReminderSettings | undefined {
  const slots = BILL_REMINDER_OPTIONS.flatMap(({ offset }) => {
    const time = times[offset];
    return typeof time === "string" && isValidReminderTime(time)
      ? [{ offset, time: time.trim() }]
      : [];
  });
  return slots.length > 0 ? { slots } : undefined;
}

/** Reminders need a due date to lean on. */
export const canHaveBillReminder = (
  bill: Pick<BillingItem, "dueDateType">,
): boolean => bill.dueDateType !== "No Due date";

export const isBillReminderEnabled = (bill: BillingItem): boolean =>
  canHaveBillReminder(bill) && Boolean(bill.reminder?.slots.length);

/**
 * Reminders landing on `day` for the given bills.
 *
 * Due dates are resolved per month from the bill's own scheme, so a monthly
 * bill that falls on the 31st clamps to the 28th in February and the "2 days
 * before" alert moves with it. The next month is checked too, because a due
 * date on the 1st puts the earlier alerts in the previous month.
 */
export function getBillReminderOccurrencesForDay(
  bills: readonly BillingItem[],
  day: Date,
): BillReminderOccurrence[] {
  const target = startOfDay(day);
  const periods = [
    getCurrentPeriod(target),
    getCurrentPeriod(new Date(target.getFullYear(), target.getMonth() + 1, 1)),
  ];
  const seen = new Set<string>();
  const occurrences: BillReminderOccurrence[] = [];

  for (const bill of bills) {
    if (!isBillReminderEnabled(bill)) continue;

    for (const period of periods) {
      const dueDate = resolveBillDueDate(bill, period);
      if (!dueDate) continue;
      const due = startOfDay(dueDate);

      for (const slot of bill.reminder!.slots) {
        const remindOn = new Date(
          due.getFullYear(),
          due.getMonth(),
          due.getDate() - slot.offset,
        );
        if (!isSameDay(remindOn, target)) continue;

        const key = `${bill.id}:${slot.offset}:${due.getTime()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const time = getTimeParts(slot.time);
        if (!time) continue;

        occurrences.push({
          bill,
          slot,
          dueDate: due,
          date: new Date(
            target.getFullYear(),
            target.getMonth(),
            target.getDate(),
            time.hours,
            time.minutes,
          ),
        });
      }
    }
  }

  return occurrences.sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      a.bill.name.localeCompare(b.bill.name, "en"),
  );
}

export const countBillRemindersForDay = (
  bills: readonly BillingItem[],
  day: Date,
): number => getBillReminderOccurrencesForDay(bills, day).length;

/** The next alerts across every bill, earliest first. */
export function buildUpcomingBillReminderOccurrences({
  bills,
  from,
  limit,
  horizonDays = BILL_REMINDER_HORIZON_DAYS,
}: {
  bills: readonly BillingItem[];
  from: Date;
  limit: number;
  horizonDays?: number;
}): BillReminderOccurrence[] {
  if (limit <= 0) return [];

  const start = startOfDay(from);
  const occurrences: BillReminderOccurrence[] = [];

  for (let index = 0; index <= horizonDays; index += 1) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    for (const occurrence of getBillReminderOccurrencesForDay(bills, day)) {
      if (occurrence.date.getTime() <= from.getTime()) continue;
      occurrences.push(occurrence);
    }
  }

  return occurrences
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);
}

/** Title/body used for the device alert of a bill reminder. */
export function describeBillReminderAlert(
  occurrence: BillReminderOccurrence,
): { title: string; body: string } {
  const when =
    occurrence.slot.offset === 0
      ? "is due today"
      : occurrence.slot.offset === 1
        ? "is due tomorrow"
        : `is due in ${occurrence.slot.offset} days`;
  return {
    title: `${occurrence.bill.name} ${when}`,
    body: `Due ${occurrence.dueDate.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}.`,
  };
}
