import {
  APP_LOCK_GRACE_PERIOD_MS,
  canAutoLock,
  shouldRelockAfterBackground,
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
  it("relocks immediately under the current zero grace period", () => {
    expect(shouldRelockAfterBackground(true, APP_LOCK_GRACE_PERIOD_MS)).toBe(
      true,
    );
  });

  it("never relocks when the app lock is disabled", () => {
    expect(shouldRelockAfterBackground(false, 60_000)).toBe(false);
  });
});
