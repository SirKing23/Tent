import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type QuickAction = {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  background: string;
  onPress: () => void;
};

export function QuickActionsGrid({
  onAddProperty,
  onOpenCashNotebook,
  onCreateBill,
}: {
  onAddProperty: () => void;
  onOpenCashNotebook: () => void;
  onCreateBill: () => void;
}) {
  const actions: QuickAction[] = [
    {
      id: "property",
      label: "Add Property",
      icon: "office-building-plus-outline",
      color: "#059669",
      background: "#ECFDF5",
      onPress: onAddProperty,
    },
    {
      id: "cashbook",
      label: "Cash Notebook",
      icon: "notebook-outline",
      color: "#D97706",
      background: "#FFFBEB",
      onPress: onOpenCashNotebook,
    },
    {
      id: "bill",
      label: "Create Bill",
      icon: "receipt-text-outline",
      color: "#4F46E5",
      background: "#EEF2FF",
      onPress: onCreateBill,
    },
  ];

  return (
    <View className="mt-6">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-bold text-slate-900">
          Quick Actions
        </Text>
        <Text className="text-xs text-slate-400">Tap to create</Text>
      </View>

      <View className="flex-row" style={{ gap: 10 }}>
        {actions.map((action) => (
          <Pressable
            key={action.id}
            accessibilityLabel={action.label}
            accessibilityRole="button"
            className="flex-1 items-center rounded-2xl border border-slate-200 bg-white px-2 py-4 active:opacity-80"
            onPress={action.onPress}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View
              className="h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: action.background }}
            >
              <MaterialCommunityIcons
                name={action.icon}
                size={22}
                color={action.color}
              />
            </View>
            <Text
              className="mt-2.5 text-center text-[11px] font-semibold leading-4 text-slate-700"
              numberOfLines={2}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
