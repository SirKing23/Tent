/**
 * Time the app may stay backgrounded before it relocks. Zero locks as soon as
 * the app leaves the foreground; a later release can raise this to a grace
 * period without changing the lock screen.
 */
export const APP_LOCK_GRACE_PERIOD_MS = 0;

export const shouldRelockAfterBackground = (
  appLockEnabled: boolean,
  backgroundedForMs: number,
): boolean =>
  appLockEnabled && backgroundedForMs >= APP_LOCK_GRACE_PERIOD_MS;
