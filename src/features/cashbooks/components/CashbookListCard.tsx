import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { AVATAR_COLORS } from "../../../constants/ui";
import { formatCurrencyWithSign } from "../../../utils/currency";
import { getDescriptionPreview } from "../../../utils/text";
import type { Cashbook } from "../types";

const getBalanceColor = (balance: number) =>
  balance > 0 ? "#047857" : balance < 0 ? "#DC2626" : "#637b99";

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
  const accentColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <Pressable
      className={`mx-4 mb-2.5 flex-row items-center rounded-[20px] border px-4 py-3.5 active:opacity-70 ${
        selected ? "border-[#C7CBFF] bg-[#F5F5FF]" : "border-[#e4eaf2] bg-white"
      }`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      <View
        className="mr-3 h-11 w-11 items-center justify-center rounded-[14px]"
        style={{
          backgroundColor: selected ? "#4C45F5" : `${accentColor}1F`,
        }}
      >
        {selected ? (
          <MaterialCommunityIcons name="check" size={22} color="#FFFFFF" />
        ) : (
          <Text
            className="text-[17px] font-extrabold"
            style={{ color: accentColor }}
          >
            {cashbook.title.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View className="min-w-0 flex-1 pr-3">
        <Text
          className="text-[15px] font-extrabold text-[#0d162a]"
          numberOfLines={1}
        >
          {cashbook.title}
        </Text>
        <Text className="mt-0.5 text-[11px] text-[#637b99]" numberOfLines={1}>
          {getDescriptionPreview(cashbook.description) || "No description"}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-[10px] font-semibold uppercase text-[#637b99]">
          Balance
        </Text>
        <Text
          className="text-[15px] font-extrabold"
          style={{ color: getBalanceColor(balance) }}
          numberOfLines={1}
        >
          {formatCurrencyWithSign(balance)}
        </Text>
      </View>
    </Pressable>
  );
}
