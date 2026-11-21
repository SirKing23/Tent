import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

import {
  formatPesoAbsolute,
  formatPesoWithSign,
} from "../../../utils/currency";
import type { MonthlyBillingReport } from "../types";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export function MonthlyBillingSummary({
  totals,
}: {
  totals: MonthlyBillingReport["totals"];
}) {
  return (
    <View className="mb-4 rounded-[24px] bg-[#11183F] p-5">
      <View className="mb-3 flex-row items-start justify-between">
        <View className="min-w-0 pr-2">
          <Text className="text-xs font-semibold text-[#B7BFE7]">
            Monthly summary
          </Text>
          {totals.missingCount > 0 ? (
            <Text className="mt-1 text-[9px] font-semibold text-[#FFCF8B]">
              {totals.missingCount} unrecorded
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1.5">
          <StatusPill
            count={totals.paidCount}
            icon="check-circle"
            iconColor="#86EFAC"
            label="paid"
            pillClassName="bg-[#123A2F]"
            textClassName="text-[#86EFAC]"
          />
          <StatusPill
            count={totals.unpaidCount}
            icon="clock-outline"
            iconColor="#FFCF8B"
            label="unpaid"
            pillClassName="bg-[#3A2A1F]"
            textClassName="text-[#FFCF8B]"
          />
        </View>
      </View>

      <View className="flex-row gap-2">
        <SummaryStat label="Billed" value={formatPesoAbsolute(totals.gross)} />
        <SummaryStat
          label="Tenant share"
          value={formatPesoAbsolute(totals.tenantCovered)}
          valueClassName="text-[#86EFAC]"
        />
        <SummaryStat
          label="Owner net"
          value={formatPesoWithSign(totals.ownerNet)}
          valueClassName={
            totals.ownerNet < 0 ? "text-[#FF9D9D]" : "text-[#C7D2FE]"
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
      accessibilityLabel={`${count} ${label} bills`}
      className={`flex-row items-center rounded-full px-2.5 py-1 ${pillClassName}`}
    >
      <MaterialCommunityIcons color={iconColor} name={icon} size={11} />
      <Text className={`ml-1 text-[10px] font-bold ${textClassName}`}>
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
