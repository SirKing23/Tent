import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import {
  formatPeso,
  formatPesoAbsolute,
} from "../../../utils/currency";
import {
  getUtilityIcon,
  getUtilityIconStyle,
} from "../../bills/components/utilityIcons";
import { isSubMeterEligible } from "../../bills/logic/billingRules";
import type { BuildingBillLine } from "../types";
import { PaymentChip } from "./PaymentChip";

export function MonthlyBillRow({
  line,
  onPress,
  onPressPayment,
}: {
  line: BuildingBillLine;
  onPress: () => void;
  onPressPayment: () => void;
}) {
  const { backgroundColor, iconColor } = getUtilityIconStyle(
    line.bill.utilityType,
  );
  const rateText =
    line.rate !== undefined
      ? ` · ${formatPeso(line.rate)}/${line.bill.displayUnit || "unit"}`
      : "";

  return (
    <Pressable
      accessibilityLabel={`Set ${line.bill.name} amount`}
      className="flex-row items-center border-b border-[#eef1f6] py-3 active:opacity-70"
      onPress={onPress}
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-[13px]"
        style={{ backgroundColor }}
      >
        <MaterialCommunityIcons
          color={iconColor}
          name={getUtilityIcon(line.bill.utilityType)}
          size={22}
        />
      </View>

      <View className="min-w-0 flex-1 pr-2">
        <View className="flex-row items-center">
          <Text
            className="mr-1.5 shrink text-sm font-extrabold text-[#0d162a]"
            numberOfLines={1}
          >
            {line.bill.name}
          </Text>
          {line.entry?.photoUri ? (
            <MaterialCommunityIcons
              color="#0891B2"
              name="camera"
              size={13}
            />
          ) : null}
        </View>
        <Text className="text-[11px] text-[#637b99]" numberOfLines={1}>
          {line.bill.billingType}
          {line.consumption !== undefined
            ? ` · ${line.consumption} ${line.bill.displayUnit || "units"}`
            : ""}
          {rateText}
        </Text>
        {line.missing ? (
          <Text className="mt-0.5 text-[11px] font-semibold text-[#B45309]">
            {isSubMeterEligible(line.bill.billingType)
              ? "Enter total reading and invoice"
              : "Enter the invoice amount"}
          </Text>
        ) : (
          <View className="mt-0.5">
            <View className="flex-row items-center">
              <Text className="text-[10px] text-[#637b99]">Tenant share </Text>
              <Text className="text-[11px] font-bold text-[#047857]">
                {formatPesoAbsolute(line.coveredAmount)}
              </Text>
            </View>
            <View className="mt-0.5 flex-row items-center">
              <Text className="text-[10px] text-[#637b99]">Owner share </Text>
              <Text
                className={`text-[11px] font-bold ${
                  (line.ownerAmount ?? 0) < 0
                    ? "text-[#DC2626]"
                    : "text-[#4C45F5]"
                }`}
              >
                {formatPesoAbsolute(line.ownerAmount ?? 0)}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className="items-end">
        <Text className="text-sm font-extrabold text-[#0d162a]">
          {line.invoiceAmount !== undefined
            ? formatPeso(line.invoiceAmount)
            : "—"}
        </Text>
        {line.ownerAmount !== undefined && line.ownerAmount < 0 ? (
          <Text className="text-[10px] font-bold text-[#DC2626]">
            Over by {formatPesoAbsolute(line.ownerAmount)}
          </Text>
        ) : null}
        <PaymentChip
          onPress={onPressPayment}
          paidAt={line.entry?.paidAt}
        />
      </View>
    </Pressable>
  );
}
