import type { BillingItem } from "../../types";
import {
  billReminderSlotLabel,
  buildBillReminder,
  buildUpcomingBillReminderOccurrences,
  countBillRemindersForDay,
  describeBillReminderAlert,
  formatReminderTime,
  getBillReminderOccurrencesForDay,
  parseBillReminder,
  serializeBillReminder,
} from "../billReminders";

const bill = (overrides: Partial<BillingItem> = {}): BillingItem => ({
  id: "electricity",
  name: "Electricity",
  utilityType: "Electricity",
  billingType: "Meter reading",
  displayUnit: "kWh",
  dueDateType: "Recurring monthly",
  recurringRule: "Day of the month",
  recurringDay: 15,
  reminder: { slots: [{ offset: 2, time: "10:00" }] },
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("bill reminder settings", () => {
  it("round-trips through the stored JSON", () => {
    const settings = { slots: [{ offset: 2, time: "09:00" } as const] };

    expect(parseBillReminder(serializeBillReminder(settings))).toEqual(
      settings,
    );
  });

  it("ignores malformed or empty settings", () => {
    expect(parseBillReminder(null)).toBeUndefined();
    expect(parseBillReminder("not json")).toBeUndefined();
    expect(parseBillReminder('{"slots":[]}')).toBeUndefined();
    expect(parseBillReminder('{"slots":[{"offset":5,"time":"09:00"}]}')).toBeUndefined();
    expect(parseBillReminder('{"slots":[{"offset":1,"time":"9am"}]}')).toBeUndefined();
    expect(serializeBillReminder(undefined)).toBeNull();
  });

  it("builds slots from the form's per-offset times", () => {
    expect(buildBillReminder({ 2: "08:00", 1: "18:30" })).toEqual({
      slots: [
        { offset: 2, time: "08:00" },
        { offset: 1, time: "18:30" },
      ],
    });
    expect(buildBillReminder({})).toBeUndefined();
    expect(buildBillReminder({ 1: "nope" })).toBeUndefined();
  });

  it("formats times and labels for the UI", () => {
    expect(formatReminderTime("09:30")).toBe("9:30 AM");
    expect(formatReminderTime("18:05")).toBe("6:05 PM");
    expect(formatReminderTime("bad")).toBe("bad");
    expect(billReminderSlotLabel(0)).toBe("On the due date");
    expect(billReminderSlotLabel(2)).toBe("2 days before");
  });
});

describe("getBillReminderOccurrencesForDay", () => {
  it("places each alert before the monthly due date", () => {
    const withBoth = bill({
      reminder: {
        slots: [
          { offset: 2, time: "10:00" },
          { offset: 1, time: "18:00" },
        ],
      },
    });

    const twoDaysBefore = getBillReminderOccurrencesForDay(
      [withBoth],
      new Date(2026, 10, 13),
    );
    expect(twoDaysBefore).toHaveLength(1);
    expect(twoDaysBefore[0].dueDate).toEqual(new Date(2026, 10, 15));
    expect(twoDaysBefore[0].date).toEqual(new Date(2026, 10, 13, 10, 0));

    const dayBefore = getBillReminderOccurrencesForDay(
      [withBoth],
      new Date(2026, 10, 14),
    );
    expect(dayBefore[0].date).toEqual(new Date(2026, 10, 14, 18, 0));
  });

  it("crosses into the previous month for a due date on the 1st", () => {
    const firstOfMonth = bill({ recurringDay: 1 });

    const occurrences = getBillReminderOccurrencesForDay(
      [firstOfMonth],
      new Date(2026, 1, 27),
    );

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].dueDate).toEqual(new Date(2026, 2, 1));
  });

  it("follows a month-end due date that clamps in February", () => {
    const endOfMonth = bill({ recurringDay: 31, reminder: { slots: [{ offset: 1, time: "09:00" }] } });

    // February 2026 has 28 days, so the 31st clamps to the 28th.
    const occurrences = getBillReminderOccurrencesForDay(
      [endOfMonth],
      new Date(2026, 1, 27),
    );

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].dueDate).toEqual(new Date(2026, 1, 28));
  });

  it("handles fixed-date bills on their own day only", () => {
    const fixed = bill({
      dueDateType: "Fixed date",
      fixedDueDate: "12/25/2026",
      recurringRule: undefined,
      recurringDay: undefined,
    });

    expect(
      getBillReminderOccurrencesForDay([fixed], new Date(2026, 11, 23)),
    ).toHaveLength(1);
    expect(
      getBillReminderOccurrencesForDay([fixed], new Date(2026, 11, 22)),
    ).toHaveLength(0);
  });

  it("never reminds for a bill without a due date or reminder", () => {
    expect(
      getBillReminderOccurrencesForDay(
        [bill({ dueDateType: "No Due date" })],
        new Date(2026, 10, 13),
      ),
    ).toHaveLength(0);
    expect(
      getBillReminderOccurrencesForDay(
        [bill({ reminder: undefined })],
        new Date(2026, 10, 13),
      ),
    ).toHaveLength(0);
  });

  it("counts every bill landing on the same day", () => {
    const second = bill({
      id: "water",
      name: "Water",
      recurringDay: 15,
      reminder: { slots: [{ offset: 2, time: "07:00" }] },
    });

    expect(
      countBillRemindersForDay([bill(), second], new Date(2026, 10, 13)),
    ).toBe(2);
  });
});

describe("buildUpcomingBillReminderOccurrences", () => {
  it("returns only future alerts, soonest first", () => {
    const upcoming = buildUpcomingBillReminderOccurrences({
      bills: [bill()],
      from: new Date(2026, 10, 13, 12, 0),
      limit: 3,
    });

    expect(upcoming.map((occurrence) => occurrence.date)).toEqual([
      new Date(2026, 11, 13, 10, 0),
      new Date(2027, 0, 13, 10, 0),
      new Date(2027, 1, 13, 10, 0),
    ]);
  });

  it("respects a zero limit", () => {
    expect(
      buildUpcomingBillReminderOccurrences({
        bills: [bill()],
        from: new Date(2026, 10, 13),
        limit: 0,
      }),
    ).toEqual([]);
  });
});

describe("describeBillReminderAlert", () => {
  it("names the bill and how soon it is due", () => {
    const [today] = getBillReminderOccurrencesForDay(
      [bill({ reminder: { slots: [{ offset: 0, time: "09:00" }] } })],
      new Date(2026, 10, 15),
    );

    expect(describeBillReminderAlert(today)).toEqual({
      title: "Electricity is due today",
      body: "Due Nov 15, 2026.",
    });
  });
});
