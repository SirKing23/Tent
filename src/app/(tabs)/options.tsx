import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type ManageOption = {
  id: string;
  label: string;
  icon: MaterialIconName;
  route?: "/bills-inbox" | "/properties" | "../tenants-inbox";
};

const manageOptions: ManageOption[] = [
  {
    id: "bills",
    label: "Bills",
    icon: "file-document-edit-outline",
    route: "/bills-inbox",
  },
  {
    id: "properties",
    label: "Properties",
    icon: "office-building-outline",
    route: "/properties",
  },
  {
    id: "tenants",
    label: "Tenants",
    icon: "account-group-outline",
    route: "../tenants-inbox",
  },
  { id: "payments", label: "Payments", icon: "cash-multiple" },
  { id: "reminders", label: "Reminders", icon: "bell-outline" },
  { id: "reports", label: "Reports", icon: "chart-box-outline" },
  { id: "settings", label: "Settings", icon: "cog-outline" },
];

export default function options() {
  return (
    <>
      <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
        <View className="border-b border-slate-200 bg-white px-4 pb-3 pt-2">
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-slate-900">Manage</Text>
              <Text className="mt-0.5 text-xs text-slate-500">
                Manage bills, properties and tenants
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            padding: 16,
          }}
        >
          {manageOptions.map((option) => (
            <Pressable
              key={option.id}
              accessibilityLabel={`Open ${option.label}`}
              accessibilityRole="button"
              className="mb-3 w-[32%] items-center overflow-hidden rounded-2xl"
              android_ripple={{ color: "#DBEAFE" }}
              onPress={() => {
                if (option.route) {
                  router.push(option.route);
                }
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.78 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <MaterialCommunityIcons
                  name={option.icon}
                  size={32}
                  color="#2563EB"
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
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
