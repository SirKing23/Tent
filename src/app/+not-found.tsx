import { Redirect } from "expo-router";

import { useAuth } from "../features/auth/hooks/useAuth";

/**
 * Safety net for stale deep links (for example a link that still points at a
 * route from a previous app version). Sends the user to the correct entry
 * screen for the current auth state instead of Expo Router's error page.
 */
export default function NotFoundScreen() {
  const { status } = useAuth();

  if (status === "onboarding") return <Redirect href="/onboarding/welcome" />;
  return <Redirect href="/" />;
}
