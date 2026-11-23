import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * Opens the Reminders screen when the user taps a reminder alert. `enabled`
 * stays false until the root navigator is mounted.
 */
export function useReminderNotificationNavigation(enabled = true): void {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!enabled || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }
    if (response.notification.request.content.data?.url !== "/reminders") {
      return;
    }
    router.navigate("/reminders");
  }, [enabled, response, router]);
}
