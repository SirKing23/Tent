import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

import { formatPeso } from "../../../utils/currency";
import { formatPeriodLabel } from "../../../utils/period";
import {
  getUtilityIcon,
  getUtilityIconStyle,
} from "../../bills/components/utilityIcons";
import type { BillShareTarget } from "../logic/billShare";

/** Bottom sheet that lets the user choose which utilities go on the invoice. */
export function BillShareSheet({
  target,
  selectedIds,
  onChange,
  onClose,
  onShare,
}: {
  target: BillShareTarget;
  selectedIds: readonly string[];
  onChange: (selectedBillIds: string[]) => void;
  onClose: () => void;
  onShare: (selectedBillIds: string[]) => void;
}) {
  const selectableIds = target.bills
    .filter((bill) => bill.amount !== undefined)
    .map((bill) => bill.id);
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((billId) => selectedIds.includes(billId));

  const toggle = (billId: string) =>
    onChange(
      selectedIds.includes(billId)
        ? selectedIds.filter((id) => id !== billId)
        : [...selectedIds, billId],
    );

  return (
    <View className="rounded-t-[28px] bg-white pb-7">
      <View className="items-center pt-3">
        <View className="h-1 w-10 rounded-full bg-[#d8e0eb]" />
      </View>

      <View className="flex-row items-start justify-between px-5 pt-4">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-[10px] font-extrabold uppercase tracking-[0.8px] text-[#8091b1]">
            Share utilities
          </Text>
          <Text
            className="text-[19px] font-extrabold text-[#0d162a]"
            numberOfLines={1}
          >
            {target.property.name}
          </Text>
          <Text className="mt-0.5 text-[11px] text-[#637b99]">
            {formatPeriodLabel(target.period)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Close"
          className="h-9 w-9 items-center justify-center rounded-full bg-[#f1f5f9] active:opacity-70"
          onPress={onClose}
        >
          <MaterialCommunityIcons color="#637b99" name="close" size={19} />
        </Pressable>
      </View>

      <View className="mt-5 flex-row items-center justify-between px-5">
        <Text className="text-[11px] font-bold text-[#637b99]">
          Select the bills to include
        </Text>
        {selectableIds.length > 0 ? (
          <Pressable
            accessibilityLabel={allSelected ? "Clear all" : "Select all"}
            className="rounded-full bg-[#EBECFF] px-3 py-1 active:opacity-70"
            onPress={() => onChange(allSelected ? [] : selectableIds)}
          >
            <Text className="text-[10px] font-extrabold text-[#4C45F5]">
              {allSelected ? "Clear all" : "Select all"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        className="mt-2 shrink"
        contentContainerStyle={{
          paddingBottom: 4,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {target.bills.length === 0 ? (
          <View className="items-center rounded-2xl border border-[#e4eaf2] bg-[#f8fafc] px-5 py-8">
            <MaterialCommunityIcons
              color="#94A3B8"
              name="receipt-text-outline"
              size={28}
            />
            <Text className="mt-2 text-[12px] font-bold text-[#637b99]">
              No utilities linked
            </Text>
            <Text className="mt-1 text-center text-[11px] text-[#8b9bb0]">
              Link bills to this property to include them on an invoice.
            </Text>
          </View>
        ) : (
          target.bills.map((bill) => {
            const unrecorded = bill.amount === undefined;
            const checked = selectedIds.includes(bill.id);
            const iconStyle = getUtilityIconStyle(bill.utilityType);

            return (
              <Pressable
                key={bill.id}
                accessibilityLabel={`${bill.name}${unrecorded ? ", no amount recorded" : ""}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled: unrecorded }}
                className={`mb-2 flex-row items-center rounded-2xl border px-3 py-2.5 ${
                  unrecorded
                    ? "border-[#eef1f6] bg-[#f8fafc] opacity-60"
                    : checked
                      ? "border-[#4C45F5] bg-[#F3F3FF]"
                      : "border-[#e4eaf2] bg-white"
                }`}
                disabled={unrecorded}
                onPress={() => toggle(bill.id)}
              >
                <MaterialCommunityIcons
                  color={
                    unrecorded ? "#C7D0DD" : checked ? "#4C45F5" : "#B6C2D2"
                  }
                  name={
                    checked
                      ? "checkbox-marked-circle"
                      : "checkbox-blank-circle-outline"
                  }
                  size={21}
                />
                <View
                  className="ml-2.5 h-9 w-9 items-center justify-center rounded-[11px]"
                  style={{ backgroundColor: iconStyle.backgroundColor }}
                >
                  <MaterialCommunityIcons
                    color={iconStyle.iconColor}
                    name={getUtilityIcon(bill.utilityType)}
                    size={18}
                  />
                </View>
                <View className="ml-2.5 min-w-0 flex-1 pr-2">
                  <Text
                    className="text-[13px] font-bold text-[#0d162a]"
                    numberOfLines={1}
                  >
                    {bill.name}
                  </Text>
                  <Text
                    className="mt-0.5 text-[10px] text-[#7c8ba1]"
                    numberOfLines={1}
                  >
                    {[
                      bill.utilityType,
                      bill.dueDate ? `Due ${bill.dueDate}` : undefined,
                      unrecorded ? "No amount recorded" : undefined,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <Text
                  className={`text-[12px] font-extrabold ${
                    unrecorded ? "text-[#94A3B8]" : "text-[#0d162a]"
                  }`}
                >
                  {bill.amount === undefined ? "—" : formatPeso(bill.amount)}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View className="px-5 pt-3">
        <Pressable
          accessibilityLabel="Share invoice"
          className={`h-[52px] flex-row items-center justify-center rounded-2xl ${
            selectedIds.length > 0 ? "bg-[#4C45F5]" : "bg-[#C7CCE8]"
          }`}
          disabled={selectedIds.length === 0}
          onPress={() => onShare([...selectedIds])}
        >
          <MaterialCommunityIcons
            color="#fff"
            name="file-document-outline"
            size={18}
          />
          <Text className="ml-2 text-[14px] font-extrabold text-white">
            Share invoice
            {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
