/** Failed attempts allowed before the first temporary lockout. */
export const LOCKOUT_THRESHOLD = 5;

/** Escalating delays after each failure at or beyond the threshold. */
const LOCK_DURATIONS_MS = [30_000, 120_000, 15 * 60_000];

/** `5` → `30_000`, `6` → `120_000`, `7+` → `900_000`. */
export const getLockDurationMs = (failedAttempts: number): number => {
  if (failedAttempts < LOCKOUT_THRESHOLD) return 0;
  const step = Math.min(
    failedAttempts - LOCKOUT_THRESHOLD,
    LOCK_DURATIONS_MS.length - 1,
  );
  return LOCK_DURATIONS_MS[step];
};

/** Milliseconds left on an ISO `locked_until` value; `0` when not locked. */
export const getRemainingLockMs = (
  lockedUntil: string | null | undefined,
  nowMs: number = Date.now(),
): number => {
  if (!lockedUntil) return 0;
  const untilMs = Date.parse(lockedUntil);
  if (Number.isNaN(untilMs)) return 0;
  return Math.max(0, untilMs - nowMs);
};

export const getAttemptsRemaining = (failedAttempts: number): number =>
  Math.max(0, LOCKOUT_THRESHOLD - failedAttempts);

/** `29_000` → `"0:29"`, `905_000` → `"15:05"`. */
export const formatLockCountdown = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};
