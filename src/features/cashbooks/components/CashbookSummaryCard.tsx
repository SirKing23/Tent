import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

import {
  formatCurrencyAbsolute,
  formatCurrencyWithSign,
} from "../../../utils/currency";
import type { CashbookSummary } from "../logic/cashbookCalculations";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export function CashbookSummaryCard({
  summary,
  bookCount,
  overdrawnCount,
}: {
  summary: CashbookSummary;
  bookCount: number;
  overdrawnCount: number;
}) {
  return (
    <View className="mx-4 mb-3 mt-1 rounded-[24px] bg-[#11183F] p-5">
      <View className="mb-3 flex-row items-start justify-between">
        <View className="min-w-0 flex-1 pr-2">
          <Text className="text-xs font-semibold text-[#B7BFE7]">
            Cash position
          </Text>
          <Text
            className="mt-1 text-[9px] font-semibold text-[#8F9AD1]"
            numberOfLines={1}
          >
            Across {bookCount} {bookCount === 1 ? "cash book" : "cash books"}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          {overdrawnCount > 0 ? (
            <StatusPill
              count={overdrawnCount}
              icon="alert-circle-outline"
              iconColor="#FF9D9D"
              label="overdrawn"
              pillClassName="bg-[#3A1F26]"
              textClassName="text-[#FF9D9D]"
            />
          ) : null}
          <StatusPill
            count={bookCount}
            icon="wallet-outline"
            iconColor="#A5B4FC"
            label={bookCount === 1 ? "book" : "books"}
            pillClassName="bg-[#232C5C]"
            textClassName="text-[#C7D2FE]"
          />
        </View>
      </View>

      <View className="flex-row gap-2">
        <SummaryStat
          label="Cash in"
          value={formatCurrencyAbsolute(summary.totalCashIn)}
          valueClassName="text-[#86EFAC]"
        />
        <SummaryStat
          label="Cash out"
          value={formatCurrencyAbsolute(summary.totalCashOut)}
          valueClassName="text-[#FFCF8B]"
        />
        <SummaryStat
          label="Balance"
          value={formatCurrencyWithSign(summary.balance)}
          valueClassName={
            summary.balance < 0 ? "text-[#FF9D9D]" : "text-[#C7D2FE]"
          }
        />
      </View>
    </View>
  );
}

function StatusPill({
  count,
  label,
  icon,
  iconColor,
  pillClassName,
  textClassName,
}: {
  count: number;
  label: string;
  icon: IconName;
  iconColor: string;
  pillClassName: string;
  textClassName: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${count} ${label}`}
      className={`flex-row items-center rounded-full px-2.5 py-1 ${pillClassName}`}
    >
      <MaterialCommunityIcons color={iconColor} name={icon} size={11} />
      <Text
        className={`ml-1 text-[10px] font-bold ${textClassName}`}
        numberOfLines={1}
      >
        {count} {label}
      </Text>
    </View>
  );
}

function SummaryStat({
  label,
  value,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="flex-1 rounded-[14px] bg-[#202852] px-2.5 py-2.5">
      <Text className="text-[10px] font-semibold text-[#B8C2E7]">{label}</Text>
      <Text
        className={`mt-1 text-sm font-extrabold ${valueClassName}`}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        {value}
      </Text>
    </View>
  );
}
