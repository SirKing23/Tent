/**
 * Bank-app behaviour: leaving Tent briefly — a share sheet, a permission
 * dialog, peeking at another app — must not re-prompt for the PIN. A real
 * absence should.
 *
 * React Native reports a device lock and an app switch identically, so the
 * length of the absence is what separates the two.
 */
export const APP_LOCK_GRACE_PERIOD_MS = 60_000;

/** Longest the app may sit untouched in the foreground before it relocks. */
export const APP_IDLE_LOCK_MS = 2 * 60_000;

export const shouldRelockAfterBackground = (
  appLockEnabled: boolean,
  backgroundedForMs: number,
): boolean => appLockEnabled && backgroundedForMs >= APP_LOCK_GRACE_PERIOD_MS;

export const shouldRelockAfterIdle = (
  appLockEnabled: boolean,
  idleForMs: number,
): boolean => appLockEnabled && idleForMs >= APP_IDLE_LOCK_MS;

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
