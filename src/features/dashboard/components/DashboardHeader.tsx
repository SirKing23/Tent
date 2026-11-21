import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export function DashboardHeader({
  greeting,
  name,
  initials,
  dateLabel,
  alertCount,
  onPressNotifications,
}: {
  greeting: string;
  name: string;
  initials: string;
  dateLabel: string;
  alertCount: number;
  onPressNotifications: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between pb-4 pt-3">
      <View className="min-w-0 flex-1 flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-emerald-600">
          <Text className="text-base font-bold text-white">{initials}</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-[2px] text-emerald-600">
            Tent
          </Text>
          <Text
            className="mt-0.5 text-[15px] font-semibold text-slate-900"
            numberOfLines={1}
          >
            {greeting}, {name}
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
            {dateLabel}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityLabel={`Notifications, ${alertCount} pending`}
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white active:opacity-70"
        onPress={onPressNotifications}
      >
        <MaterialCommunityIcons
          name="bell-outline"
          size={21}
          color="#0F172A"
        />
        {alertCount > 0 ? (
          <View className="absolute right-2 top-2 h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1">
            <Text className="text-[9px] font-bold text-white">
              {alertCount > 9 ? "9+" : alertCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
