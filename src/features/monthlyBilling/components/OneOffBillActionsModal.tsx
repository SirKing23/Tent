import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

import { useSheetBottomPadding } from "../../../hooks/useSheetInsets";
import { formatPeriodLabel } from "../../../utils/period";
import type { BillingItem } from "../../bills/types";
import type { Property } from "../../properties/types";

export type OneOffBillActionTarget = {
  property: Property;
  bill: BillingItem;
};

/** Long-press menu for a bill that only exists in the selected month. */
export function OneOffBillActionsModal({
  target,
  period,
  onClose,
  onEdit,
  onDelete,
}: {
  target: OneOffBillActionTarget;
  period: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sheetBottomPadding = useSheetBottomPadding(32);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          accessibilityLabel="Close bill actions"
          className="flex-1"
          onPress={onClose}
        />
        <View
          className="rounded-t-3xl bg-white px-5 pt-5"
          style={{ paddingBottom: sheetBottomPadding }}
        >
          <View className="mb-4 flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text
                className="text-lg font-extrabold text-slate-900"
                numberOfLines={1}
              >
                {target.bill.name}
              </Text>
              <Text className="mt-0.5 text-[12px] text-slate-500">
                One-off bill · {formatPeriodLabel(period)} ·{" "}
                {target.property.name}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close bill actions"
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              onPress={onClose}
            >
              <MaterialCommunityIcons
                color="#475569"
                name="close"
                size={20}
              />
            </Pressable>
          </View>

          <Pressable
            accessibilityLabel={`Edit ${target.bill.name}`}
            className="mb-2 flex-row items-center rounded-2xl border border-[#e4eaf2] bg-white px-4 py-3.5 active:opacity-70"
            onPress={onEdit}
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-[13px] bg-[#EBECFF]">
              <MaterialCommunityIcons
                color="#4C45F5"
                name="pencil-outline"
                size={20}
              />
            </View>
            <Text className="flex-1 text-[14px] font-extrabold text-[#0d162a]">
              Edit
            </Text>
            <MaterialCommunityIcons
              color="#94A3B8"
              name="chevron-right"
              size={20}
            />
          </Pressable>

          <Pressable
            accessibilityLabel={`Delete ${target.bill.name}`}
            className="mb-4 flex-row items-center rounded-2xl border border-[#fecaca] bg-white px-4 py-3.5 active:opacity-70"
            onPress={onDelete}
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-[13px] bg-[#FEF2F2]">
              <MaterialCommunityIcons
                color="#DC2626"
                name="trash-can-outline"
                size={20}
              />
            </View>
            <Text className="flex-1 text-[14px] font-extrabold text-[#DC2626]">
              Delete
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Cancel bill actions"
            className="h-12 items-center justify-center rounded-xl bg-slate-100 active:opacity-70"
            onPress={onClose}
          >
            <Text className="text-sm font-bold text-slate-700">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
