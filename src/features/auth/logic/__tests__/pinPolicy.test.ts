import {
  getAttemptsRemaining,
  formatLockCountdown,
  getLockDurationMs,
  getRemainingLockMs,
  LOCKOUT_THRESHOLD,
} from "../pinPolicy";
import { shouldRelockAfterBackground } from "../lockPolicy";

describe("pinPolicy", () => {
  it("does not lock before the threshold", () => {
    for (let attempts = 0; attempts < LOCKOUT_THRESHOLD; attempts += 1) {
      expect(getLockDurationMs(attempts)).toBe(0);
    }
  });

  it("escalates lockouts and caps the longest delay", () => {
    expect(getLockDurationMs(LOCKOUT_THRESHOLD)).toBe(30_000);
    expect(getLockDurationMs(LOCKOUT_THRESHOLD + 1)).toBe(120_000);
    expect(getLockDurationMs(LOCKOUT_THRESHOLD + 2)).toBe(900_000);
    expect(getLockDurationMs(50)).toBe(900_000);
  });

  it("reports attempts remaining without going negative", () => {
    expect(getAttemptsRemaining(0)).toBe(LOCKOUT_THRESHOLD);
    expect(getAttemptsRemaining(4)).toBe(1);
    expect(getAttemptsRemaining(9)).toBe(0);
  });

  it("computes the remaining lock time and formats it", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const until = new Date(now + 29_000).toISOString();

    expect(getRemainingLockMs(until, now)).toBe(29_000);
    expect(getRemainingLockMs(null, now)).toBe(0);
    expect(getRemainingLockMs("not-a-date", now)).toBe(0);
    expect(getRemainingLockMs(until, now + 60_000)).toBe(0);

    expect(formatLockCountdown(29_000)).toBe("0:29");
    expect(formatLockCountdown(905_000)).toBe("15:05");
  });

  it("locks immediately for the default background policy", () => {
    expect(shouldRelockAfterBackground(true, 0)).toBe(true);
    expect(shouldRelockAfterBackground(true, 60_000)).toBe(true);
    expect(shouldRelockAfterBackground(false, 60_000)).toBe(false);
  });
});
