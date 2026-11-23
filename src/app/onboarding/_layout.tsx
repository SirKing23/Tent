import { Stack } from "expo-router";

import { OnboardingProvider } from "../../features/onboarding/providers/OnboardingProvider";

export const unstable_settings = {
  anchor: "welcome",
};

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}
