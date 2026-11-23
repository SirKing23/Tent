import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import { resetApplicationData, RESETTABLE_TABLES } from "../appDataReset";
import { getDatabase } from "../database";
import { deleteAllStoredPhotos } from "../photoStorage";

jest.mock("../database", () => ({ getDatabase: jest.fn() }));
jest.mock("../photoStorage", () => ({ deleteAllStoredPhotos: jest.fn() }));
jest.mock("expo-notifications", () => ({
  cancelAllScheduledNotificationsAsync: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { clear: jest.fn() },
}));

const mockedGetDatabase = getDatabase as jest.MockedFunction<
  typeof getDatabase
>;

const createFakeDb = () => ({
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
  withTransactionAsync: jest.fn(async (task: () => Promise<void>) => {
    await task();
  }),
});

describe("resetApplicationData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes every user table in one transaction", async () => {
    const db = createFakeDb();
    mockedGetDatabase.mockResolvedValue(db as never);

    await resetApplicationData();

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);

    const deletedTables = db.runAsync.mock.calls.map(([sql]) =>
      String(sql).replace("DELETE FROM ", ""),
    );
    expect(deletedTables).toEqual([...RESETTABLE_TABLES]);
    expect(deletedTables).toEqual(
      expect.arrayContaining([
        "user_profile",
        "app_security",
        "app_settings",
        "cashbooks",
        "cashbook_entries",
        "properties",
        "tenants",
        "monthly_bill_entries",
        "monthly_bill_items",
        "billing_items",
        "reminders",
        "meta",
      ]),
    );

    expect(db.execAsync).toHaveBeenCalledWith("PRAGMA secure_delete = ON;");
    expect(db.execAsync).toHaveBeenCalledWith("VACUUM;");
  });

  it("removes photos, scheduled alerts, and legacy storage", async () => {
    const db = createFakeDb();
    mockedGetDatabase.mockResolvedValue(db as never);

    await resetApplicationData();

    expect(deleteAllStoredPhotos).toHaveBeenCalledTimes(1);
    expect(
      Notifications.cancelAllScheduledNotificationsAsync,
    ).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.clear).toHaveBeenCalledTimes(1);
  });

  it("stops before clearing files when the database transaction fails", async () => {
    const db = createFakeDb();
    db.runAsync.mockRejectedValueOnce(new Error("database is locked"));
    mockedGetDatabase.mockResolvedValue(db as never);

    await expect(resetApplicationData()).rejects.toThrow("database is locked");

    // The account is only reported as reset after the database succeeds, but
    // the photo folder must not be left behind on a failed attempt.
    expect(deleteAllStoredPhotos).not.toHaveBeenCalled();
    expect(AsyncStorage.clear).not.toHaveBeenCalled();
  });
});
