import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { formatCurrency } from "../../../utils/currency";
import { getDueDateSummary } from "../logic/billingRules";
import type { BillingItem } from "../types";
import { getUtilityIcon, getUtilityIconStyle } from "./utilityIcons";

type BillListCardProps = {
  bill: BillingItem;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

export function BillListCard({
  bill,
  selected,
  onPress,
  onLongPress,
}: BillListCardProps) {
  const utilityIconStyle = getUtilityIconStyle(bill.utilityType);
  const dueDateSummary = getDueDateSummary(bill);

  return (
    <Pressable
      className="mx-3 mb-2 h-[88px] flex-row items-center overflow-hidden rounded-xl bg-white shadow-sm"
      android_ripple={{ color: "#DBEAFE" }}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        className="h-full w-[82px] items-center justify-center"
        style={{ backgroundColor: utilityIconStyle.backgroundColor }}
      >
        {selected ? (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-teal-700">
            <MaterialCommunityIcons name="check" size={23} color="#FFFFFF" />
          </View>
        ) : (
          <MaterialCommunityIcons
            name={getUtilityIcon(bill.utilityType)}
            size={34}
            color={utilityIconStyle.iconColor}
          />
        )}
      </View>
      <View className="min-w-0 flex-1 px-3">
        <View className="flex-row items-center">
          <Text
            className="min-w-0 flex-1 text-base font-bold text-slate-900"
            numberOfLines={1}
          >
            {bill.name}
          </Text>
          <Text className="ml-2 text-sm font-bold text-slate-900">
            {bill.defaultAmount === undefined
              ? "—"
              : formatCurrency(bill.defaultAmount)}
          </Text>
        </View>
        <Text className="mt-1 text-sm text-slate-500" numberOfLines={1}>
          {bill.billingType}
        </Text>
        <View className="mt-1 flex-row items-center">
          <Text className="flex-1 text-xs text-slate-500" numberOfLines={1}>
            {bill.displayUnit || "No display unit"} · {dueDateSummary}
          </Text>
          <View className="rounded-full bg-blue-50 px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-blue-700">
              {bill.dueDateType}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
