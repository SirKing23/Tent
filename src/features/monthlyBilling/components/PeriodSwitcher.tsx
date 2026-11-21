import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { formatPeriodLabel, shiftPeriod } from "../../../utils/period";

export function PeriodSwitcher({
  period,
  onChange,
}: {
  period: string;
  onChange: (period: string) => void;
}) {
  return (
    <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-[#e4eaf2] bg-white px-2 py-1.5">
      <Pressable
        accessibilityLabel="Previous month"
        className="h-10 w-10 items-center justify-center rounded-full"
        onPress={() => onChange(shiftPeriod(period, -1))}
      >
        <MaterialCommunityIcons name="chevron-left" size={24} color="#334155" />
      </Pressable>
      <Text className="text-base font-extrabold text-[#0d162a]">
        {formatPeriodLabel(period)}
      </Text>
      <Pressable
        accessibilityLabel="Next month"
        className="h-10 w-10 items-center justify-center rounded-full"
        onPress={() => onChange(shiftPeriod(period, 1))}
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color="#334155"
        />
      </Pressable>
    </View>
  );
}
