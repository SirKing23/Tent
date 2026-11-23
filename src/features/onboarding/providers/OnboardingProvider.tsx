import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type { PinCredential } from "../../auth/types";
import { EMPTY_ONBOARDING_DRAFT, type OnboardingDraft } from "../types";

type OnboardingContextValue = {
  draft: OnboardingDraft;
  setProfile: (profile: { fullName: string; email: string }) => void;
  setPinCredential: (credential: PinCredential) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setPrivacyAcceptedAt: (acceptedAt: string | null) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Holds what the user entered so stepping backward between onboarding screens
 * keeps their details. The plaintext PIN is never stored here — only the
 * derived credential once the two entries matched.
 */
export function OnboardingProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_ONBOARDING_DRAFT);

  const setProfile = useCallback(
    (profile: { fullName: string; email: string }) => {
      setDraft((current) => ({ ...current, ...profile }));
    },
    [],
  );

  const setPinCredential = useCallback((credential: PinCredential) => {
    setDraft((current) => ({ ...current, pinCredential: credential }));
  }, []);

  const setBiometricEnabled = useCallback((enabled: boolean) => {
    setDraft((current) => ({ ...current, biometricEnabled: enabled }));
  }, []);

  const setPrivacyAcceptedAt = useCallback((acceptedAt: string | null) => {
    setDraft((current) => ({ ...current, privacyAcceptedAt: acceptedAt }));
  }, []);

  const value = useMemo(
    () => ({
      draft,
      setProfile,
      setPinCredential,
      setBiometricEnabled,
      setPrivacyAcceptedAt,
    }),
    [
      draft,
      setProfile,
      setPinCredential,
      setBiometricEnabled,
      setPrivacyAcceptedAt,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingDraft(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error(
      "useOnboardingDraft must be used within an OnboardingProvider",
    );
  }
  return value;
}
