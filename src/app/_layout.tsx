import { Stack } from "expo-router";
import { useEffect } from "react";

import { useReminderNotificationNavigation } from "../features/reminders/hooks/useReminderNotificationNavigation";
import { configureReminderNotifications } from "../features/reminders/services/reminderNotifications";

export default function RootLayout() {
  useReminderNotificationNavigation();

  useEffect(() => {
    void configureReminderNotifications();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
