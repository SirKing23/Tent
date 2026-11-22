import {
  buildReminder,
  buildUpcomingReminderOccurrences,
  countRemindersForDay,
  getDefaultReminderDate,
  getMonthGrid,
  getRemindersForDay,
  getUpcomingOccurrences,
  mergeDatePart,
  mergeTimePart,
  moveToMonth,
  reminderOccursOnDay,
} from "../reminderCalendar";
import type { Reminder } from "../../types";

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: "reminder-1",
  title: "Collect rent",
  notes: "",
  remindAt: new Date(2026, 10, 21, 9, 0).toISOString(),
  repeat: "none",
  createdAt: new Date(2026, 10, 20).toISOString(),
  ...overrides,
});

describe("getMonthGrid", () => {
  it("returns six Sunday-first weeks starting on the month's first week", () => {
    const days = getMonthGrid(new Date(2026, 10, 15));

    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(0);
    expect(days[0].getDate()).toBe(1);
    expect(days[0].getMonth()).toBe(10);
  });

  it("pads the grid with the previous month when the month starts mid-week", () => {
    const days = getMonthGrid(new Date(2026, 11, 10));

    expect(days[0].getMonth()).toBe(10);
    expect(days[0].getDate()).toBe(29);
    expect(days[2].getMonth()).toBe(11);
    expect(days[2].getDate()).toBe(1);
  });
});

describe("reminderOccursOnDay", () => {
  const start = new Date(2026, 10, 21, 9, 0);

  it("matches only the start day for one-off reminders", () => {
    const item = reminder({ remindAt: start.toISOString() });

    expect(reminderOccursOnDay(item, new Date(2026, 10, 21, 18, 0))).toBe(true);
    expect(reminderOccursOnDay(item, new Date(2026, 10, 22))).toBe(false);
  });

  it("never matches days before the start date", () => {
    const daily = reminder({ remindAt: start.toISOString(), repeat: "daily" });

    expect(reminderOccursOnDay(daily, new Date(2026, 10, 20))).toBe(false);
    expect(reminderOccursOnDay(daily, new Date(2026, 10, 25))).toBe(true);
  });

  it("matches the same weekday for weekly reminders", () => {
    const weekly = reminder({
      remindAt: start.toISOString(),
      repeat: "weekly",
    });

    expect(reminderOccursOnDay(weekly, new Date(2026, 10, 28))).toBe(true);
    expect(reminderOccursOnDay(weekly, new Date(2026, 10, 27))).toBe(false);
  });

  it("matches the same day of the month for monthly reminders", () => {
    const monthly = reminder({
      remindAt: new Date(2026, 0, 31, 9, 0).toISOString(),
      repeat: "monthly",
    });

    expect(reminderOccursOnDay(monthly, new Date(2026, 2, 31))).toBe(true);
    expect(reminderOccursOnDay(monthly, new Date(2026, 1, 28))).toBe(false);
  });
});

describe("getRemindersForDay", () => {
  it("filters the day and sorts by time of day", () => {
    const day = new Date(2026, 10, 21);
    const items = [
      reminder({
        id: "late",
        remindAt: new Date(2026, 10, 21, 17, 0).toISOString(),
      }),
      reminder({
        id: "early",
        remindAt: new Date(2026, 10, 21, 8, 30).toISOString(),
      }),
      reminder({ id: "other-day", remindAt: new Date(2026, 10, 22).toISOString() }),
    ];

    expect(getRemindersForDay(items, day).map((item) => item.id)).toEqual([
      "early",
      "late",
    ]);
    expect(countRemindersForDay(items, day)).toBe(2);
  });
});

describe("getUpcomingOccurrences", () => {
  it("returns the single future occurrence for one-off reminders", () => {
    const item = reminder({ remindAt: new Date(2026, 10, 21, 9, 0).toISOString() });

    expect(
      getUpcomingOccurrences(item, new Date(2026, 10, 21, 8, 0), 5),
    ).toHaveLength(1);
    expect(
      getUpcomingOccurrences(item, new Date(2026, 10, 21, 10, 0), 5),
    ).toHaveLength(0);
  });

  it("only starts repeating on the reminder's start day", () => {
    const daily = reminder({
      remindAt: new Date(2026, 10, 25, 7, 30).toISOString(),
      repeat: "daily",
    });

    const occurrences = getUpcomingOccurrences(
      daily,
      new Date(2026, 10, 21, 12, 0),
      3,
    );

    expect(occurrences).toHaveLength(3);
    expect(occurrences[0].getDate()).toBe(25);
    expect(occurrences[1].getDate()).toBe(26);
    expect(occurrences[2].getDate()).toBe(27);
    expect(occurrences[0].getHours()).toBe(7);
  });

  it("skips months that do not have the recurring day", () => {
    const monthly = reminder({
      remindAt: new Date(2026, 0, 31, 9, 0).toISOString(),
      repeat: "monthly",
    });

    const occurrences = getUpcomingOccurrences(
      monthly,
      new Date(2026, 1, 1),
      2,
    );

    expect(occurrences.map((date) => [date.getMonth(), date.getDate()])).toEqual(
      [
        [2, 31],
        [4, 31],
      ],
    );
  });
});

describe("buildUpcomingReminderOccurrences", () => {
  it("merges every reminder in time order and honours the limit", () => {
    const items = [
      reminder({
        id: "daily",
        remindAt: new Date(2026, 10, 21, 7, 0).toISOString(),
        repeat: "daily",
      }),
      reminder({
        id: "once",
        remindAt: new Date(2026, 10, 22, 6, 0).toISOString(),
      }),
    ];

    const occurrences = buildUpcomingReminderOccurrences(
      items,
      new Date(2026, 10, 21, 5, 0),
      3,
    );

    expect(occurrences).toHaveLength(3);
    expect(occurrences.map((entry) => entry.reminder.id)).toEqual([
      "daily",
      "once",
      "daily",
    ]);
    expect(occurrences[1].date.getTime()).toBeLessThan(
      occurrences[2].date.getTime(),
    );
  });
});

describe("getDefaultReminderDate", () => {
  it("uses the morning default for another day", () => {
    const value = getDefaultReminderDate(
      new Date(2026, 10, 22),
      new Date(2026, 10, 21, 15, 10),
    );

    expect([value.getDate(), value.getHours(), value.getMinutes()]).toEqual([
      22, 9, 0,
    ]);
  });

  it("uses the next hour when the selected day is today", () => {
    const value = getDefaultReminderDate(
      new Date(2026, 10, 21, 9, 0),
      new Date(2026, 10, 21, 15, 10),
    );

    expect([value.getDate(), value.getHours(), value.getMinutes()]).toEqual([
      21, 16, 10,
    ]);
  });

  it("stays within the same day late at night", () => {
    const value = getDefaultReminderDate(
      new Date(2026, 10, 21),
      new Date(2026, 10, 21, 23, 30),
    );

    expect([value.getDate(), value.getHours(), value.getMinutes()]).toEqual([
      21, 23, 55,
    ]);
  });
});

describe("moveToMonth", () => {
  it("keeps the day of month when paging months", () => {
    const moved = moveToMonth(new Date(2026, 10, 21), new Date(2026, 11, 1));

    expect([moved.getMonth(), moved.getDate()]).toEqual([11, 21]);
  });

  it("clamps to the last day of shorter months", () => {
    const moved = moveToMonth(new Date(2026, 0, 31), new Date(2026, 1, 1));

    expect([moved.getMonth(), moved.getDate()]).toEqual([1, 28]);
  });
});

describe("picker helpers", () => {  it("merges only the date part", () => {
    const merged = mergeDatePart(
      new Date(2026, 10, 21, 9, 30),
      new Date(2026, 11, 5, 18, 45),
    );

    expect([merged.getMonth(), merged.getDate(), merged.getHours(), merged.getMinutes()]).toEqual([
      11, 5, 9, 30,
    ]);
  });

  it("merges only the time part", () => {
    const merged = mergeTimePart(
      new Date(2026, 10, 21, 9, 30),
      new Date(2000, 0, 1, 18, 45),
    );

    expect([merged.getMonth(), merged.getDate(), merged.getHours(), merged.getMinutes()]).toEqual([
      10, 21, 18, 45,
    ]);
  });
});

describe("buildReminder", () => {
  it("trims input and keeps the identity of the edited reminder", () => {
    const existing = reminder();

    const next = buildReminder(
      {
        title: "  Collect rent  ",
        notes: "  Unit 2  ",
        date: new Date(2026, 11, 1, 10, 0),
        repeat: "weekly",
      },
      existing,
    );

    expect(next.id).toBe(existing.id);
    expect(next.createdAt).toBe(existing.createdAt);
    expect(next.title).toBe("Collect rent");
    expect(next.notes).toBe("Unit 2");
    expect(next.repeat).toBe("weekly");
    expect(new Date(next.remindAt).getHours()).toBe(10);
  });
});
