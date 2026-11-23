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
import { AppState } from "react-native";

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
import { shouldRelockAfterBackground } from "../logic/lockPolicy";
import { loadAuthSnapshot, verifyPinAttempt } from "../services/authService";
import {
  authenticateWithBiometrics,
  getBiometricCapability,
} from "../services/biometricService";
import {
  clearFailedAttempts,
  updateBiometricEnabled,
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
  /** Persists onboarding data in one transaction; status stays `onboarding`. */
  saveOnboarding: (draft: OnboardingDraft) => Promise<void>;
  /** Ends onboarding and lets the router move into the app. */
  enterApp: (destination?: Href) => void;
  /** Wipes every local record and returns to onboarding. */
  deleteAccount: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<PinVerificationResult>;
  unlockWithBiometrics: () => Promise<BiometricResult>;
  setAppLockEnabled: (enabled: boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<BiometricResult>;
  lockNow: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("initializing");
  const [profile, setProfile] = useState<UserProfile>(EMPTY_USER_PROFILE);
  const [appLockEnabled, setAppLockEnabledState] = useState(true);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const statusRef = useRef<AuthStatus>("initializing");
  const appLockEnabledRef = useRef(true);
  const biometricEnabledRef = useRef(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const isUnlockingRef = useRef(false);
  const pendingRouteRef = useRef<Href | null>(null);

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

  // Relock as soon as the app leaves the foreground (immediate policy).
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        backgroundedAtRef.current = Date.now();
        if (
          !isUnlockingRef.current &&
          statusRef.current === "authenticated" &&
          appLockEnabledRef.current
        ) {
          updateStatus("locked");
        }
        return;
      }

      if (nextState === "active" && backgroundedAtRef.current !== null) {
        const backgroundedForMs = Date.now() - backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (
          !isUnlockingRef.current &&
          statusRef.current === "authenticated" &&
          shouldRelockAfterBackground(
            appLockEnabledRef.current,
            backgroundedForMs,
          )
        ) {
          updateStatus("locked");
        }
      }
    });

    return () => subscription.remove();
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
      throw new Error("A six-digit PIN is required to finish setup.");
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
    };
    configureCurrency(nextProfile.currencyCode, nextProfile.currencySymbol);
    setProfile(nextProfile);
    setAppLockEnabledState(true);
    appLockEnabledRef.current = true;
    setBiometricEnabledState(draft.biometricEnabled);
    biometricEnabledRef.current = draft.biometricEnabled;
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
          updateStatus("authenticated");
        }
        return result;
      } finally {
        isUnlockingRef.current = false;
        setIsUnlocking(false);
      }
    }, [updateStatus]);

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
    updateStatus("onboarding");
  }, [updateStatus]);

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
      saveOnboarding,
      enterApp,
      deleteAccount,
      unlockWithPin,
      unlockWithBiometrics,
      setAppLockEnabled,
      setBiometricEnabled,
      lockNow,
    }),
    [
      status,
      profile,
      appLockEnabled,
      biometricEnabled,
      isUnlocking,
      saveOnboarding,
      enterApp,
      deleteAccount,
      unlockWithPin,
      unlockWithBiometrics,
      setAppLockEnabled,
      setBiometricEnabled,
      lockNow,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
