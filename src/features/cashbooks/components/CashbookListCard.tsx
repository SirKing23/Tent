import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { AVATAR_COLORS } from "../../../constants/ui";
import { formatPesoWithSign } from "../../../utils/currency";
import { getDescriptionPreview } from "../../../utils/text";
import type { Cashbook } from "../types";

const getBalanceColor = (balance: number) =>
  balance > 0 ? "#15803D" : balance < 0 ? "#DC2626" : "#64748B";

type CashbookListCardProps = {
  cashbook: Cashbook;
  index: number;
  balance: number;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

export function CashbookListCard({
  cashbook,
  index,
  balance,
  selected,
  onPress,
  onLongPress,
}: CashbookListCardProps) {
  return (
    <Pressable
      className={`mx-3 mb-1 min-h-[78px] flex-row items-center rounded-lg border px-3 py-3 ${selected ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      <View
        className="mr-3 h-11 w-11 items-center justify-center rounded-full"
        style={{
          backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
        }}
      >
        {selected ? (
          <MaterialCommunityIcons name="check" size={23} color="#FFFFFF" />
        ) : (
          <Text className="text-lg font-bold text-white">
            {cashbook.title.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View className="min-w-0 flex-1 pr-2">
        <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
          {cashbook.title}
        </Text>
        <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={1}>
          {getDescriptionPreview(cashbook.description) || "No description"}
        </Text>
      </View>
      <Text
        className="text-sm font-bold"
        style={{ color: getBalanceColor(balance) }}
      >
        {formatPesoWithSign(balance)}
      </Text>
    </Pressable>
  );
}
