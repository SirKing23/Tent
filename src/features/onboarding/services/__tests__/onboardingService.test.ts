import { getDatabase } from "../../../../services/database";
import type { PinCredential } from "../../../auth/types";
import { saveOnboardingData } from "../onboardingService";

jest.mock("../../../../services/database", () => ({
  getDatabase: jest.fn(),
}));

const mockedGetDatabase = getDatabase as jest.MockedFunction<
  typeof getDatabase
>;

const CREDENTIAL: PinCredential = {
  hash: "a".repeat(64),
  salt: "b".repeat(32),
  algorithm: "PBKDF2-SHA256",
  iterations: 100_000,
};

const submission = {
  fullName: "  Ana   Reyes ",
  email: " ANA@Example.com ",
  pinCredential: CREDENTIAL,
  biometricEnabled: true,
  privacyAcceptedAt: "2026-01-01T00:00:00.000Z",
};

const createFakeDb = (
  runAsync: jest.Mock = jest.fn().mockResolvedValue({ changes: 1 }),
) => ({
  withTransactionAsync: jest.fn(async (task: () => Promise<void>) => {
    await task();
  }),
  runAsync,
});

const sqlParams = (runAsync: jest.Mock): unknown[][] =>
  runAsync.mock.calls.map((call) => call.slice(1));

describe("saveOnboardingData", () => {
  beforeEach(() => {
    mockedGetDatabase.mockReset();
  });

  it("writes profile, PIN hash, and settings in one transaction", async () => {
    const db = createFakeDb();
    mockedGetDatabase.mockResolvedValue(db as never);

    await saveOnboardingData(submission);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);

    const sqls = db.runAsync.mock.calls.map((call) => String(call[0]));
    expect(sqls.some((sql) => sql.includes("INSERT INTO user_profile"))).toBe(
      true,
    );
    expect(sqls.some((sql) => sql.includes("INSERT INTO app_security"))).toBe(
      true,
    );
    expect(sqls.some((sql) => sql.includes("INSERT INTO app_settings"))).toBe(
      true,
    );

    const params = sqlParams(db.runAsync);
    const profileParams = params[sqls.findIndex((sql) => sql.includes("user_profile"))];
    expect(profileParams).toEqual([
      "local",
      "Ana Reyes",
      "ana@example.com",
      "PHP",
      "₱",
      expect.any(String),
      expect.any(String),
    ]);

    const securityParams = params[sqls.findIndex((sql) => sql.includes("app_security"))];
    expect(securityParams).toContain(CREDENTIAL.hash);
    expect(securityParams).toContain(CREDENTIAL.salt);
    expect(securityParams).toContain(1);

    const settingsParams = params.filter((_, index) =>
      sqls[index].includes("app_settings"),
    );
    const keys = settingsParams.map((values) => values[1]);
    expect(keys).toEqual([
      "privacy_notice_version",
      "privacy_accepted_at",
      "app_lock_enabled",
      "onboarding_completed",
    ]);
  });

  it("never writes the plaintext PIN", async () => {
    const db = createFakeDb();
    mockedGetDatabase.mockResolvedValue(db as never);

    await saveOnboardingData({ ...submission, pinCredential: CREDENTIAL });

    const flatParams = sqlParams(db.runAsync).flat();
    expect(flatParams.map(String)).not.toContain("123456");
  });

  it("rejects invalid profile details before touching the database", async () => {
    const db = createFakeDb();
    mockedGetDatabase.mockResolvedValue(db as never);

    await expect(
      saveOnboardingData({ ...submission, fullName: "   " }),
    ).rejects.toThrow("not valid");

    expect(db.withTransactionAsync).not.toHaveBeenCalled();
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it("requires the privacy notice to be accepted", async () => {
    const db = createFakeDb();
    mockedGetDatabase.mockResolvedValue(db as never);

    await expect(
      saveOnboardingData({ ...submission, privacyAcceptedAt: "" }),
    ).rejects.toThrow("privacy notice");

    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it("does not record completion when a write fails", async () => {
    const runAsync: jest.Mock = jest.fn(async (sql: string) => {
      if (sql.includes("user_profile")) throw new Error("disk full");
      return { changes: 1 };
    });
    const db = createFakeDb(runAsync);
    mockedGetDatabase.mockResolvedValue(db as never);

    await expect(saveOnboardingData(submission)).rejects.toThrow("disk full");

    const sqls = runAsync.mock.calls.map((call) => String(call[0]));
    const completedWrite = runAsync.mock.calls.find(
      (call) => call[1] === "onboarding_completed",
    );
    expect(completedWrite).toBeUndefined();
    expect(sqls.some((sql) => sql.includes("user_profile"))).toBe(true);
  });
});
