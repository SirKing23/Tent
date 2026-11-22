import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "../../../global.css";
import { ActivityFeed } from "../../features/dashboard/components/ActivityFeed";
import { AttentionSection } from "../../features/dashboard/components/AttentionSection";
import { DashboardHeader } from "../../features/dashboard/components/DashboardHeader";
import { NotificationsSheet } from "../../features/dashboard/components/NotificationsSheet";
import { PortfolioHeroCard } from "../../features/dashboard/components/PortfolioHeroCard";
import { QuickActionsGrid } from "../../features/dashboard/components/QuickActionsGrid";
import { Toast, type ToastMessage } from "../../features/dashboard/components/Toast";
import { useDashboard } from "../../features/dashboard/hooks/useDashboard";
import {
  getGreeting,
  getMonthLabel,
} from "../../features/dashboard/logic/dashboardData";
import type { PaymentAlert } from "../../features/dashboard/types";
import { useUserProfile } from "../../features/profile/hooks/useUserProfile";
import {
  getProfileFirstName,
  getProfileInitials,
} from "../../features/profile/logic/profile";
import { formatDateLong } from "../../utils/date";

const CONTENT_MAX_WIDTH = 640;

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const {
    period,
    metrics,
    alerts,
    todayReminders,
    activity,
    totalProperties,
    isLoading,
    refresh,
    markPaid,
  } = useDashboard();

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hideToast = useCallback(() => setToast(null), []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const handleMarkPaid = useCallback(
    async (alert: PaymentAlert) => {
      setMarkingId(alert.id);
      try {
        await markPaid(alert);
        setToast({
          message: `Payment recorded for ${alert.unitLabel}.`,
          tone: "success",
        });
      } catch (error) {
        console.error("Unable to mark bill as paid:", error);
        setToast({ message: "Unable to record the payment.", tone: "error" });
      } finally {
        setMarkingId(null);
      }
    },
    [markPaid],
  );

  const handleRemind = useCallback(async (alert: PaymentAlert) => {
    const phone = alert.tenantPhone.replace(/[^\d+]/g, "");
    if (!phone) {
      setToast({
        message: `No phone number on file for ${alert.tenantName}.`,
        tone: "info",
      });
      return;
    }

    try {
      await Linking.openURL(`sms:${phone}`);
      setToast({
        message: `Reminder opened for ${alert.tenantName}.`,
        tone: "success",
      });
    } catch {
      setToast({ message: "Unable to open the messaging app.", tone: "error" });
    }
  }, []);

  const firstName = getProfileFirstName(profile.fullName);
  const initials = getProfileInitials(profile.fullName);
  const greeting = getGreeting();
  const dateLabel = formatDateLong(new Date());

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={["top"]}>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#059669" size="large" />
          <Text className="mt-3 text-sm text-slate-500">
            Loading your portfolio…
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              colors={["#059669"]}
              onRefresh={() => void handleRefresh()}
              refreshing={isRefreshing}
              tintColor="#059669"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View
            className="w-full self-center px-4"
            style={{ maxWidth: CONTENT_MAX_WIDTH }}
          >
            <DashboardHeader
              alertCount={alerts.length + todayReminders.length}
              dateLabel={dateLabel}
              greeting={greeting}
              initials={initials}
              name={firstName}
              onPressNotifications={() => setShowNotifications(true)}
            />

            <PortfolioHeroCard
              metrics={metrics}
              monthLabel={getMonthLabel(period)}
            />

            <QuickActionsGrid
              onAddProperty={() => router.push("/properties-AddNewProperties")}
              onCreateBill={() => router.push("/bills-AddNewBill")}
              onOpenCashNotebook={() => router.push("/cashbook-AddNewBook")}
            />

            {totalProperties === 0 ? (
              <Pressable
                accessibilityLabel="Add your first property"
                accessibilityRole="button"
                className="mt-3 flex-row items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-4 active:opacity-80"
                onPress={() => router.push("/properties-AddNewProperties")}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                  <MaterialCommunityIcons
                    name="home-plus-outline"
                    size={20}
                    color="#059669"
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-slate-900">
                    Start with your first property
                  </Text>
                  <Text className="mt-0.5 text-xs text-slate-600">
                    Add a building or unit to unlock rent tracking.
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#059669"
                />
              </Pressable>
            ) : null}

            <AttentionSection
              alerts={alerts}
              markingId={markingId}
              onCreateBill={() => router.push("/bills-AddNewBill")}
              onMarkPaid={(alert) => void handleMarkPaid(alert)}
              onOpenBillings={() => router.push("/monthlyBillings")}
              onRemind={(alert) => void handleRemind(alert)}
            />

            <ActivityFeed
              activity={activity}
              onOpenCashbooks={() => router.push("/cashbooks")}
            />
          </View>
        </ScrollView>
      )}

      <Toast onHide={hideToast} toast={toast} />

      <NotificationsSheet
        alerts={alerts}
        reminders={todayReminders}
        onClose={() => setShowNotifications(false)}
        onOpenBillings={() => {
          setShowNotifications(false);
          router.push("/monthlyBillings");
        }}
        onOpenReminders={() => {
          setShowNotifications(false);
          router.push("/reminders");
        }}
        visible={showNotifications}
      />
    </SafeAreaView>
  );
}
