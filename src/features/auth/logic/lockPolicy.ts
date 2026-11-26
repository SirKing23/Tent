/**
 * Time the app may stay backgrounded before it relocks. Zero locks as soon as
 * the app leaves the foreground; a later release can raise this to a grace
 * period without changing the lock screen.
 */
export const APP_LOCK_GRACE_PERIOD_MS = 0;

export const shouldRelockAfterBackground = (
  appLockEnabled: boolean,
  backgroundedForMs: number,
): boolean => appLockEnabled && backgroundedForMs >= APP_LOCK_GRACE_PERIOD_MS;

type AutoLockState = {
  appLockEnabled: boolean;
  status: "initializing" | "onboarding" | "locked" | "authenticated";
  isUnlocking: boolean;
  /** True while a camera or photo picker is in front of the app. */
  isSystemUiOpen: boolean;
};

/**
 * Whether the current state allows the app to relock. System surfaces such as
 * the camera or photo library background Tent without the user leaving it, so
 * they must not send the app back to the lock screen mid-task.
 */
export const canAutoLock = ({
  appLockEnabled,
  status,
  isUnlocking,
  isSystemUiOpen,
}: AutoLockState): boolean =>
  appLockEnabled &&
  status === "authenticated" &&
  !isUnlocking &&
  !isSystemUiOpen;
