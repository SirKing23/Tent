import "../../global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { AppLogo } from "../../components/AppLogo";
import { LockScreen } from "../features/auth/components/LockScreen";
import { useAuth } from "../features/auth/hooks/useAuth";
import { AuthProvider } from "../features/auth/providers/AuthProvider";
import { useReminderNotificationNavigation } from "../features/reminders/hooks/useReminderNotificationNavigation";
import { configureReminderNotifications } from "../features/reminders/services/reminderNotifications";

void SplashScreen.preventAutoHideAsync().catch(() => {});

/** Routes only reachable once onboarding is complete and the app is unlocked. */
const PROTECTED_ROUTES = [
  "(tabs)",
  "_sitemap",
  "bills-AddNewBill",
  "bills-inbox",
  "cashbook-AddNewBook",
  "cashbook-AddNewEntry",
  "cashbook-Inbox",
  "gallery",
  "invoice-settings",
  "monthlyBilling-units",
  "properties-AddNewProperties",
  "properties-summary",
  "property-inbox",
  "reports",
  "reminders",
  "security-settings",
  "tenants-AddNewTenants",
  "tenants-inbox",
] as const;

function RootNavigator() {
  const { status, noteActivity } = useAuth();
  useReminderNotificationNavigation(status !== "initializing");

  useEffect(() => {
    if (status === "initializing") return;
    void SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  if (status === "initializing") {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <AppLogo className="mb-8" elevated size={88} />
        <ActivityIndicator color="#059669" size="large" />
        <Text className="mt-3 text-sm text-slate-500">
          Loading your workspace…
        </Text>
      </View>
    );
  }

  return (
    // Touch tracking feeds the idle timer that drives the bank-app relock.
    <View className="flex-1" onTouchStart={noteActivity}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === "onboarding"}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>

        {/*
          Locking must not unmount the app: `locked` keeps this group mounted so
          the PIN gate can cover the current screen and return the user to it.
        */}
        <Stack.Protected guard={status !== "onboarding"}>
          {PROTECTED_ROUTES.map((name) => (
            <Stack.Screen key={name} name={name} />
          ))}
        </Stack.Protected>
      </Stack>

      {status === "locked" ? <LockScreen /> : null}
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void configureReminderNotifications();
  }, []);

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
