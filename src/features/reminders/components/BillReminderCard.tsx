import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { formatDateMDY } from "../../../utils/date";
import {
  billReminderSlotLabel,
  formatReminderTime,
  type BillReminderOccurrence,
} from "../../bills/logic/billReminders";

/**
 * A bill's reminder on the Reminders page. It is derived from the bill, so it
 * is read-only here: tapping opens the bill form that owns the settings.
 */
export function BillReminderCard({
  occurrence,
  onPress,
}: {
  occurrence: BillReminderOccurrence;
  onPress: () => void;
}) {
  return (
    <View className="mb-2 rounded-2xl border border-indigo-100 bg-white">
      <Pressable
        accessibilityLabel={`Open bill ${occurrence.bill.name}`}
        accessibilityRole="button"
        className="flex-row items-center px-3.5 py-3 active:opacity-70"
        onPress={onPress}
      >
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
          <MaterialCommunityIcons
            color="#4C45F5"
            name="file-document-outline"
            size={20}
          />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center">
            <Text
              className="mr-2 text-sm font-semibold text-slate-900"
              numberOfLines={1}
            >
              {occurrence.bill.name}
            </Text>
            <View className="rounded-full bg-indigo-50 px-2 py-0.5">
              <Text className="text-[9px] font-bold uppercase tracking-wide text-[#4C45F5]">
                Bill
              </Text>
            </View>
          </View>
          <Text className="mt-0.5 text-xs text-slate-500">
            {formatReminderTime(occurrence.slot.time)} ·{" "}
            {billReminderSlotLabel(occurrence.slot.offset)}
          </Text>
          <Text className="mt-1 text-xs text-slate-400">
            Due {formatDateMDY(occurrence.dueDate)}
          </Text>
        </View>

        <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
      </Pressable>
    </View>
  );
}
