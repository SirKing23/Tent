import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  resetReminderNotificationChannel,
  syncReminderNotifications,
} from "../reminderNotifications";
import type { Reminder } from "../../types";

const mockScheduled: { identifier: string }[] = [];
const mockPermission = { granted: true };
const mockScheduleNotificationAsync = jest.fn(
  async (request: { identifier: string }) => request.identifier,
);

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => mockPermission),
  requestPermissionsAsync: jest.fn(async () => mockPermission),
  getAllScheduledNotificationsAsync: jest.fn(async () => mockScheduled),
  scheduleNotificationAsync: (...args: unknown[]) =>
    mockScheduleNotificationAsync(...(args as [{ identifier: string }])),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: "date" },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

const reminder = (overrides: Partial<Reminder> = {}): Reminder => ({
  id: "r1",
  title: "Collect rent",
  notes: "",
  remindAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  repeat: "none",
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("syncReminderNotifications", () => {
  beforeEach(() => {
    mockScheduled.length = 0;
    mockPermission.granted = true;
    jest.clearAllMocks();
  });

  it("schedules upcoming occurrences and skips reminders in the past", async () => {
    const upcoming = reminder();
    const past = reminder({
      id: "past",
      remindAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });

    await syncReminderNotifications([upcoming, past]);

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const request = mockScheduleNotificationAsync.mock.calls[0][0];
    expect(request.identifier).toContain("reminder-r1-");
  });

  it("cancels stale reminder alerts but keeps unrelated notifications", async () => {
    mockScheduled.push(
      { identifier: "reminder-deleted-123" },
      { identifier: "other-feature" },
    );

    await syncReminderNotifications([]);

    expect(
      Notifications.cancelScheduledNotificationAsync,
    ).toHaveBeenCalledWith("reminder-deleted-123");
    expect(
      Notifications.cancelScheduledNotificationAsync,
    ).not.toHaveBeenCalledWith("other-feature");
  });

  it("does not reschedule alerts that are already pending", async () => {
    const item = reminder();
    const occurrence = new Date(item.remindAt).getTime();
    mockScheduled.push({ identifier: `reminder-r1-${occurrence}` });

    await syncReminderNotifications([item]);

    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("does nothing when notifications are not allowed", async () => {
    mockPermission.granted = false;

    await syncReminderNotifications([reminder()]);

    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  describe("on Android", () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, "OS", "android");
      resetReminderNotificationChannel();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("creates the reminder channel once per app run", async () => {
      await syncReminderNotifications([reminder()]);
      await syncReminderNotifications([reminder()]);

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        "reminders",
        expect.objectContaining({ name: "Reminders" }),
      );
    });

    it("keeps scheduling alerts when the channel cannot be created", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      jest
        .mocked(Notifications.setNotificationChannelAsync)
        .mockRejectedValueOnce(new Error("channel unavailable"));

      await expect(
        syncReminderNotifications([reminder()]),
      ).resolves.toBeUndefined();
      expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });
  });
});
