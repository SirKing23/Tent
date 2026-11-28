import {
  APP_IDLE_LOCK_MS,
  APP_LOCK_GRACE_PERIOD_MS,
  canAutoLock,
  shouldRelockAfterBackground,
  shouldRelockAfterIdle,
} from "../lockPolicy";

const unlockedState = {
  appLockEnabled: true,
  status: "authenticated" as const,
  isUnlocking: false,
  isSystemUiOpen: false,
};

describe("canAutoLock", () => {
  it("allows locking for an authenticated app with the lock enabled", () => {
    expect(canAutoLock(unlockedState)).toBe(true);
  });

  it("keeps the app unlocked while a camera or photo picker is open", () => {
    expect(canAutoLock({ ...unlockedState, isSystemUiOpen: true })).toBe(false);
  });

  it("never locks while the app lock is disabled", () => {
    expect(canAutoLock({ ...unlockedState, appLockEnabled: false })).toBe(
      false,
    );
  });

  it("does not lock while an unlock is in progress", () => {
    expect(canAutoLock({ ...unlockedState, isUnlocking: true })).toBe(false);
  });

  it("does not relock from a state other than authenticated", () => {
    expect(canAutoLock({ ...unlockedState, status: "locked" })).toBe(false);
    expect(canAutoLock({ ...unlockedState, status: "onboarding" })).toBe(false);
    expect(canAutoLock({ ...unlockedState, status: "initializing" })).toBe(
      false,
    );
  });
});

describe("shouldRelockAfterBackground", () => {
  it("uses a one minute grace period", () => {
    expect(APP_LOCK_GRACE_PERIOD_MS).toBe(60_000);
  });

  it("keeps the session for short trips into another app", () => {
    expect(shouldRelockAfterBackground(true, 0)).toBe(false);
    expect(shouldRelockAfterBackground(true, 5_000)).toBe(false);
    expect(
      shouldRelockAfterBackground(true, APP_LOCK_GRACE_PERIOD_MS - 1),
    ).toBe(false);
  });

  it("relocks once the grace period has passed", () => {
    expect(shouldRelockAfterBackground(true, APP_LOCK_GRACE_PERIOD_MS)).toBe(
      true,
    );
    expect(shouldRelockAfterBackground(true, 15 * 60_000)).toBe(true);
  });

  it("never relocks when the app lock is disabled", () => {
    expect(shouldRelockAfterBackground(false, 60_000)).toBe(false);
  });
});

describe("shouldRelockAfterIdle", () => {
  it("leaves a couple of minutes of inactivity before locking", () => {
    expect(APP_IDLE_LOCK_MS).toBe(2 * 60_000);
    expect(shouldRelockAfterIdle(true, 0)).toBe(false);
    expect(shouldRelockAfterIdle(true, APP_IDLE_LOCK_MS - 1)).toBe(false);
    expect(shouldRelockAfterIdle(true, APP_IDLE_LOCK_MS)).toBe(true);
  });

  it("never locks on idle when the app lock is disabled", () => {
    expect(shouldRelockAfterIdle(false, 60 * 60_000)).toBe(false);
  });
});
