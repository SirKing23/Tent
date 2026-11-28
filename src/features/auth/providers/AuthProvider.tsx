import { router, type Href } from "expo-router";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Keyboard } from "react-native";

import {
  DEFAULT_CURRENCY_CODE,
  DEFAULT_CURRENCY_SYMBOL,
  EMPTY_USER_PROFILE,
  type UserProfile,
} from "../../profile/types";
import { normalizeEmail, normalizeFullName } from "../../profile/logic/profile";
import { setSetting } from "../../settings/services/settingsRepository";
import { resetApplicationData } from "../../../services/appDataReset";
import { configureCurrency } from "../../../utils/currency";
import type { OnboardingDraft } from "../../onboarding/types";
import { saveOnboardingData } from "../../onboarding/services/onboardingService";
import {
  canAutoLock,
  shouldRelockAfterBackground,
  shouldRelockAfterIdle,
} from "../logic/lockPolicy";
import { isValidPin, PIN_LENGTH } from "../logic/pinValidation";
import { loadAuthSnapshot, verifyPinAttempt } from "../services/authService";
import {
  authenticateWithBiometrics,
  getBiometricCapability,
} from "../services/biometricService";
import { createPinCredential } from "../services/pinService";
import {
  clearFailedAttempts,
  updateBiometricEnabled,
  updatePinCredential,
} from "../services/securityRepository";
import type {
  AuthStatus,
  BiometricResult,
  PinVerificationResult,
} from "../types";

type AuthContextValue = {
  status: AuthStatus;
  profile: UserProfile;
  appLockEnabled: boolean;
  biometricEnabled: boolean;
  isUnlocking: boolean;
  /** Digits the stored PIN expects: four, or six for accounts made before the switch. */
  pinLength: number;
  /** Persists onboarding data in one transaction; status stays `onboarding`. */
  saveOnboarding: (draft: OnboardingDraft) => Promise<void>;
  /** Ends onboarding and lets the router move into the app. */
  enterApp: (destination?: Href) => void;
  /** Wipes every local record and returns to onboarding. */
  deleteAccount: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<PinVerificationResult>;
  unlockWithBiometrics: () => Promise<BiometricResult>;
  /** Verifies the current PIN, then stores a new four-digit one. */
  changePin: (
    currentPin: string,
    nextPin: string,
  ) => Promise<PinVerificationResult>;
  /** Records user interaction so the idle timer does not lock mid-task. */
  noteActivity: () => void;
  setAppLockEnabled: (enabled: boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<BiometricResult>;
  lockNow: () => void;
  /**
   * Runs `task` without the app auto-locking. Used around system surfaces like
   * the camera and photo picker, which briefly background Tent.
   */
  runWithoutAutoLock: <T>(task: () => Promise<T>) => Promise<T>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("initializing");
  const [profile, setProfile] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [appLockEnabled, setAppLockEnabledState] = useState(true);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [pinLength, setPinLength] = useState<number>(PIN_LENGTH);

  const statusRef = useRef<AuthStatus>("initializing");
  const appLockEnabledRef = useRef(true);
  const biometricEnabledRef = useRef(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const isUnlockingRef = useRef(false);
  const pendingRouteRef = useRef<Href | null>(null);
  // >0 while a system surface (camera, photo picker) is in front of the app.
  const autoLockSuppressionRef = useRef(0);
  // `null` until the first interaction of the session is observed.
  const lastActivityAtRef = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const noteActivity = useCallback(() => {
    lastActivityAtRef.current = Date.now();
  }, []);

  const updateStatus = useCallback((next: AuthStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const snapshot = await loadAuthSnapshot();
        if (cancelled) return;

        configureCurrency(
          snapshot.profile.currencyCode,
          snapshot.profile.currencySymbol,
        );
        setProfile(snapshot.profile);
        setAppLockEnabledState(snapshot.settings.appLockEnabled);
        appLockEnabledRef.current = snapshot.settings.appLockEnabled;
        setBiometricEnabledState(snapshot.biometricEnabled);
        biometricEnabledRef.current = snapshot.biometricEnabled;
        setPinLength(snapshot.pinLength);

        if (!snapshot.settings.onboardingCompleted || !snapshot.hasPin) {
          updateStatus("onboarding");
        } else if (snapshot.settings.appLockEnabled) {
          updateStatus("locked");
        } else {
          updateStatus("authenticated");
        }
      } catch (error) {
        console.error("Unable to initialize app security:", error);
        if (!cancelled) updateStatus("onboarding");
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [updateStatus]);

  /**
   * Bank-app timing: a short absence (share sheet, permission dialog, a peek
   * at another app) keeps the session, a longer one relocks. The device being
   * locked also reports `background`, so a real lock screen falls under the
   * same rule.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;

      if (nextState === "background") {
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (nextState !== "active") return;

      // Coming back is interaction; it restarts the idle clock either way.
      lastActivityAtRef.current = Date.now();
      if (backgroundedAtRef.current === null) return;

      const backgroundedForMs = Date.now() - backgroundedAtRef.current;
      backgroundedAtRef.current = null;
      if (
        canAutoLock({
          appLockEnabled: appLockEnabledRef.current,
          status: statusRef.current,
          isUnlocking: isUnlockingRef.current,
          isSystemUiOpen: autoLockSuppressionRef.current > 0,
        }) &&
        shouldRelockAfterBackground(
          appLockEnabledRef.current,
          backgroundedForMs,
        )
      ) {
        updateStatus("locked");
      }
    });

    return () => subscription.remove();
  }, [updateStatus]);

  // Relock once the app has been open but untouched for too long. The tick is
  // coarse on purpose: it costs nothing and a few seconds late is invisible.
  useEffect(() => {
    const interval = setInterval(() => {
      if (statusRef.current !== "authenticated") return;
      if (appStateRef.current !== "active") return;
      if (isUnlockingRef.current) return;
      if (!appLockEnabledRef.current) return;
      // An open keyboard means the user is in a form; keystrokes never reach
      // the touch tracker, so treating it as activity avoids locking mid-edit.
      if (Keyboard.isVisible()) {
        lastActivityAtRef.current = Date.now();
        return;
      }

      const now = Date.now();
      const lastActivity = lastActivityAtRef.current;
      if (lastActivity === null) {
        lastActivityAtRef.current = now;
        return;
      }
      if (
        shouldRelockAfterIdle(appLockEnabledRef.current, now - lastActivity)
      ) {
        updateStatus("locked");
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [updateStatus]);

  // A destination requested from the last onboarding screen has to be applied
  // after the guard has allowed the app group, otherwise it is rejected.
  useEffect(() => {
    if (status !== "authenticated") return;
    const destination = pendingRouteRef.current;
    if (!destination) return;

    pendingRouteRef.current = null;
    try {
      router.replace(destination);
    } catch {
      // The protected stack already falls back to the dashboard.
    }
  }, [status]);

  const saveOnboarding = useCallback(async (draft: OnboardingDraft) => {
    if (!draft.pinCredential) {
      throw new Error(`A ${PIN_LENGTH}-digit PIN is required to finish setup.`);
    }
    if (!draft.privacyAcceptedAt) {
      throw new Error("Accept the privacy notice to finish setup.");
    }

    await saveOnboardingData({
      fullName: draft.fullName,
      email: draft.email,
      pinCredential: draft.pinCredential,
      biometricEnabled: draft.biometricEnabled,
      privacyAcceptedAt: draft.privacyAcceptedAt,
    });

    const nextProfile: UserProfile = {
      fullName: normalizeFullName(draft.fullName),
      email: normalizeEmail(draft.email),
      currencyCode: DEFAULT_CURRENCY_CODE,
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      photo: "",
    };
    configureCurrency(nextProfile.currencyCode, nextProfile.currencySymbol);
    setProfile(nextProfile);
    setAppLockEnabledState(true);
    appLockEnabledRef.current = true;
    setBiometricEnabledState(draft.biometricEnabled);
    biometricEnabledRef.current = draft.biometricEnabled;
    setPinLength(draft.pinCredential.length);
  }, []);

  const enterApp = useCallback(
    (destination?: Href) => {
      pendingRouteRef.current = destination ?? null;
      updateStatus("authenticated");
    },
    [updateStatus],
  );

  const unlockWithPin = useCallback(
    async (pin: string): Promise<PinVerificationResult> => {
      isUnlockingRef.current = true;
      setIsUnlocking(true);
      try {
        const result = await verifyPinAttempt(pin);
        if (result.ok) {
          backgroundedAtRef.current = null;
          lastActivityAtRef.current = Date.now();
          updateStatus("authenticated");
        }
        return result;
      } finally {
        isUnlockingRef.current = false;
        setIsUnlocking(false);
      }
    },
    [updateStatus],
  );

  const unlockWithBiometrics =
    useCallback(async (): Promise<BiometricResult> => {
      if (!biometricEnabledRef.current) {
        return { ok: false, reason: "unavailable" };
      }

      isUnlockingRef.current = true;
      setIsUnlocking(true);
      try {
        const result = await authenticateWithBiometrics("Unlock Tent");
        if (result.ok) {
          // Best effort: a failed counter reset must not block a valid unlock.
          await clearFailedAttempts().catch(() => {});
          backgroundedAtRef.current = null;
          lastActivityAtRef.current = Date.now();
          updateStatus("authenticated");
        }
        return result;
      } finally {
        isUnlockingRef.current = false;
        setIsUnlocking(false);
      }
    }, [updateStatus]);

  const changePin = useCallback(
    async (
      currentPin: string,
      nextPin: string,
    ): Promise<PinVerificationResult> => {
      const verification = await verifyPinAttempt(currentPin, new Date(), {
        refreshCost: false,
      });
      if (!verification.ok) return verification;
      if (!isValidPin(nextPin)) {
        throw new Error(`Choose a ${PIN_LENGTH}-digit PIN.`);
      }

      isUnlockingRef.current = true;
      setIsUnlocking(true);
      try {
        const credential = await createPinCredential(nextPin);
        await updatePinCredential(credential);
        setPinLength(credential.length);
        lastActivityAtRef.current = Date.now();
        return { ok: true };
      } finally {
        isUnlockingRef.current = false;
        setIsUnlocking(false);
      }
    },
    [],
  );

  const setAppLockEnabled = useCallback(async (enabled: boolean) => {
    await setSetting("app_lock_enabled", enabled ? "true" : "false");
    appLockEnabledRef.current = enabled;
    setAppLockEnabledState(enabled);
  }, []);

  const setBiometricEnabled = useCallback(
    async (enabled: boolean): Promise<BiometricResult> => {
      if (enabled) {
        const capability = await getBiometricCapability();
        if (!capability.available || !capability.enrolled) {
          return { ok: false, reason: "unavailable" };
        }

        isUnlockingRef.current = true;
        setIsUnlocking(true);
        try {
          const result = await authenticateWithBiometrics(
            "Enable biometric unlock",
          );
          if (!result.ok) return result;
        } finally {
          isUnlockingRef.current = false;
          setIsUnlocking(false);
        }
      }

      await updateBiometricEnabled(enabled);
      biometricEnabledRef.current = enabled;
      setBiometricEnabledState(enabled);
      return { ok: true };
    },
    [],
  );

  const deleteAccount = useCallback(async () => {
    await resetApplicationData();

    pendingRouteRef.current = null;
    backgroundedAtRef.current = null;
    configureCurrency(DEFAULT_CURRENCY_CODE, DEFAULT_CURRENCY_SYMBOL);
    setProfile(EMPTY_USER_PROFILE);
    setAppLockEnabledState(true);
    appLockEnabledRef.current = true;
    setBiometricEnabledState(false);
    biometricEnabledRef.current = false;
    setPinLength(PIN_LENGTH);
    updateStatus("onboarding");
  }, [updateStatus]);

  /**
   * The camera and photo picker briefly push Tent to the background. Keep the
   * app unlocked while one is open so the user returns to the same screen
   * instead of the PIN pad.
   */
  const runWithoutAutoLock = useCallback(
    async <T,>(task: () => Promise<T>): Promise<T> => {
      autoLockSuppressionRef.current += 1;
      try {
        return await task();
      } finally {
        autoLockSuppressionRef.current = Math.max(
          0,
          autoLockSuppressionRef.current - 1,
        );
        // The system round-trip itself is not an absence, but a user who stays
        // in the app they shared to is: restart the clock instead of clearing it.
        if (autoLockSuppressionRef.current === 0) {
          lastActivityAtRef.current = Date.now();
          backgroundedAtRef.current =
            AppState.currentState === "active" ? null : Date.now();
        }
      }
    },
    [],
  );

  const lockNow = useCallback(() => {
    if (statusRef.current !== "authenticated") return;
    if (!appLockEnabledRef.current) return;
    updateStatus("locked");
  }, [updateStatus]);

  const value = useMemo(
    () => ({
      status,
      profile,
      appLockEnabled,
      biometricEnabled,
      isUnlocking,
      pinLength,
      saveOnboarding,
      enterApp,
      deleteAccount,
      unlockWithPin,
      unlockWithBiometrics,
      changePin,
      noteActivity,
      setAppLockEnabled,
      setBiometricEnabled,
      lockNow,
      runWithoutAutoLock,
    }),
    [
      status,
      profile,
      appLockEnabled,
      biometricEnabled,
      isUnlocking,
      pinLength,
      saveOnboarding,
      enterApp,
      deleteAccount,
      unlockWithPin,
      unlockWithBiometrics,
      changePin,
      noteActivity,
      setAppLockEnabled,
      setBiometricEnabled,
      lockNow,
      runWithoutAutoLock,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
