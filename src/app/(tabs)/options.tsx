import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileAvatar } from "../../features/profile/components/ProfileAvatar";
import { ProfileEditorSheet } from "../../features/profile/components/ProfileEditorSheet";
import { useUserProfile } from "../../features/profile/hooks/useUserProfile";
import { getProfileInitials } from "../../features/profile/logic/profile";

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type ManageOption = {
  id: string;
  label: string;
  icon: MaterialIconName;
  route?:
    | "/bills-inbox"
    | "/gallery"
    | "/invoice-settings"
    | "/reports"
    | "/reminders"
    | "/security-settings"
    | "../tenants-inbox";
};

const manageOptions: ManageOption[] = [
  {
    id: "bills",
    label: "Bills",
    icon: "file-document-edit-outline",
    route: "/bills-inbox",
  },
  {
    id: "tenants",
    label: "Tenants",
    icon: "account-group-outline",
    route: "../tenants-inbox",
  },
  {
    id: "invoice",
    label: "Invoice",
    icon: "receipt-text-outline",
    route: "/invoice-settings",
  },
  {
    id: "gallery",
    label: "Gallery",
    icon: "image-multiple-outline",
    route: "/gallery",
  },
  {
    id: "reports",
    label: "Reports",
    icon: "chart-box-outline",
    route: "/reports",
  },
  {
    id: "reminders",
    label: "Reminders",
    icon: "bell-outline",
    route: "/reminders",
  },
  {
    id: "security",
    label: "Security",
    icon: "shield-lock-outline",
    route: "/security-settings",
  },
];

export default function OptionsScreen() {
  const { profile, save } = useUserProfile();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const initials = getProfileInitials(profile.fullName);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="border-b border-slate-200 bg-white px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold text-slate-900">Manage</Text>
        <Text className="mt-0.5 text-xs text-slate-500">
          Bills and tenants
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <Pressable
          accessibilityLabel="Edit account settings"
          accessibilityRole="button"
          className="flex-row items-center rounded-2xl border border-slate-200 bg-white p-4 active:opacity-80"
          onPress={() => setIsEditingProfile(true)}
        >
          <View className="h-12 w-12 overflow-hidden rounded-full">
            <ProfileAvatar initials={initials} photo={profile.photo} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-slate-900">
              {profile.fullName.trim() || "Set up your account"}
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
              {profile.email.trim() ||
                "Add your name to personalize the dashboard"}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color="#94A3B8"
          />
        </Pressable>

        <View className="mt-6 mb-3 flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-[1.5px] text-slate-400">
            Manage
          </Text>
        </View>

        <View
          className="flex-row flex-wrap justify-between"
          style={{ rowGap: 12 }}
        >
          {manageOptions.map((option) => (
            <Pressable
              key={option.id}
              accessibilityLabel={`Open ${option.label}`}
              accessibilityRole="button"
              className="w-[32%] items-center rounded-2xl bg-white py-4 active:opacity-70"
              onPress={() => {
                if (option.route) router.push(option.route);
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.78 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <View className="mb-2 h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                <MaterialCommunityIcons
                  name={option.icon}
                  size={26}
                  color="#059669"
                />
              </View>
              <Text
                className="text-center text-xs font-semibold text-slate-700"
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ProfileEditorSheet
        onClose={() => setIsEditingProfile(false)}
        onSave={save}
        profile={profile}
        visible={isEditingProfile}
      />
    </SafeAreaView>
  );
}
