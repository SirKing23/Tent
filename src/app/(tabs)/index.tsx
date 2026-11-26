import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "../../../global.css";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { ActivityFeed } from "../../features/dashboard/components/ActivityFeed";
import { AttentionSection } from "../../features/dashboard/components/AttentionSection";
import { DashboardHeader } from "../../features/dashboard/components/DashboardHeader";
import { NotificationsSheet } from "../../features/dashboard/components/NotificationsSheet";
import { PortfolioHeroCard } from "../../features/dashboard/components/PortfolioHeroCard";
import { QuickActionsGrid } from "../../features/dashboard/components/QuickActionsGrid";
import {
  Toast,
  type ToastMessage,
} from "../../features/dashboard/components/Toast";
import { useDashboard } from "../../features/dashboard/hooks/useDashboard";
import {
  getGreeting,
  getMonthLabel,
} from "../../features/dashboard/logic/dashboardData";
import type { PaymentAlert } from "../../features/dashboard/types";
import { PhotoTagFlow } from "../../features/monthlyBilling/components/PhotoTagFlow";
import { ProfileEditorSheet } from "../../features/profile/components/ProfileEditorSheet";
import {
  ProfileMenu,
  type ProfileMenuAnchor,
  type ProfileMenuItem,
} from "../../features/profile/components/ProfileMenu";
import { useUserProfile } from "../../features/profile/hooks/useUserProfile";
import {
  getProfileFirstName,
  getProfileInitials,
} from "../../features/profile/logic/profile";
import { useImageSourcePicker } from "../../hooks/useImageSourcePicker";
import { formatDateLong } from "../../utils/date";

const CONTENT_MAX_WIDTH = 640;

export default function HomeScreen() {
  const router = useRouter();
  const { appLockEnabled, lockNow } = useAuth();
  const { profile, save } = useUserProfile();
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] =
    useState<ProfileMenuAnchor | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const { pickImages } = useImageSourcePicker();

  const openProfileMenu = useCallback((anchor: ProfileMenuAnchor | null) => {
    setProfileMenuAnchor(anchor);
    setIsProfileMenuOpen(true);
  }, []);

  const closeProfileMenu = useCallback(() => setIsProfileMenuOpen(false), []);

  // Leaving Home (tab switch or navigation) must not leave the menu floating.
  useFocusEffect(
    useCallback(() => {
      return closeProfileMenu;
    }, [closeProfileMenu]),
  );

  const profileMenuItems = useMemo<ProfileMenuItem[]>(() => {
    const items: ProfileMenuItem[] = [
      {
        id: "account",
        label: "Account settings",
        description: "Name, photo, currency and security",
        icon: "account-cog-outline",
        onPress: () => setIsEditingProfile(true),
      },
      {
        id: "manage",
        label: "Manage",
        description: "Bills, properties and tenants",
        icon: "view-dashboard-outline",
        onPress: () => router.push("/options"),
      },
    ];

    // Without an app lock there is nothing to log out of; the PIN gate is off.
    if (appLockEnabled) {
      items.push({
        id: "logout",
        label: "Log out",
        description: "Lock Tent and require your PIN",
        icon: "logout",
        onPress: lockNow,
      });
    }

    return items;
  }, [appLockEnabled, lockNow, router]);

  const hideToast = useCallback(() => setToast(null), []);

  const handleTakePhoto = useCallback(async () => {
    const [uri] = await pickImages("camera", {
      cameraPermissionMessage:
        "Camera access is needed to take the photo you want to tag.",
    });
    if (uri) setCapturedPhotoUri(uri);
  }, [pickImages]);

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

  const handleOpenAlert = useCallback(
    (alert: PaymentAlert) => {
      router.push({
        pathname: "/monthlyBillings",
        params: {
          period,
          highlightUnitId: alert.unitId,
          highlightToken: String(Date.now()),
        },
      });
    },
    [period, router],
  );

  const firstName = getProfileFirstName(profile.fullName);
  const initials = getProfileInitials(profile.fullName);
  const greeting = getGreeting();
  const dateLabel = formatDateLong(new Date());

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <SafeAreaView className="flex-1" edges={["top"]}>
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
                onPressAvatar={openProfileMenu}
                onPressNotifications={() => setShowNotifications(true)}
                photo={profile.photo}
              />

              <PortfolioHeroCard
                metrics={metrics}
                monthLabel={getMonthLabel(period)}
              />

              <QuickActionsGrid
                onAddProperty={() =>
                  router.push("/properties-AddNewProperties")
                }
                onOpenCashNotebook={() => router.push("/cashbook-AddNewBook")}
                onOpenGallery={() => router.push("/gallery")}
                onTakePhoto={() => void handleTakePhoto()}
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
                onOpenAlert={handleOpenAlert}
                onOpenBillings={() => router.push("/monthlyBillings")}
              />

              <ActivityFeed
                activity={activity}
                onOpenCashbooks={() => router.push("/cashbooks")}
              />
            </View>
          </ScrollView>
        )}

        <Toast onHide={hideToast} toast={toast} />

        <ProfileEditorSheet
          onClose={() => setIsEditingProfile(false)}
          onSave={save}
          profile={profile}
          visible={isEditingProfile}
        />

        {capturedPhotoUri ? (
          <PhotoTagFlow
            onClose={() => setCapturedPhotoUri(null)}
            onSaved={({ billName, propertyName }) => {
              setCapturedPhotoUri(null);
              setToast({
                message: `Photo tagged to ${billName} · ${propertyName}.`,
                tone: "success",
              });
            }}
            photoUri={capturedPhotoUri}
          />
        ) : null}

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

      <ProfileMenu
        anchor={profileMenuAnchor}
        items={profileMenuItems}
        onClose={closeProfileMenu}
        visible={isProfileMenuOpen}
      />
    </View>
  );
}
