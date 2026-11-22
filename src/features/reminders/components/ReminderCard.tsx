import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { REMINDER_REPEAT_LABELS } from "../../../constants/reminders";
import { formatTimeLabel } from "../logic/reminderCalendar";
import type { Reminder } from "../types";

type ReminderCardProps = {
  reminder: Reminder;
  onPress: () => void;
  onDelete: () => void;
};

export function ReminderCard({
  reminder,
  onPress,
  onDelete,
}: ReminderCardProps) {
  const date = new Date(reminder.remindAt);
  const repeatLabel = REMINDER_REPEAT_LABELS[reminder.repeat];

  return (
    <View className="mb-2 flex-row items-center rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
      <Pressable
        accessibilityLabel={`Edit reminder ${reminder.title}`}
        accessibilityRole="button"
        className="flex-1 flex-row items-center active:opacity-70"
        onPress={onPress}
      >
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
          <MaterialCommunityIcons
            name={
              reminder.repeat === "none" ? "bell-outline" : "bell-ring-outline"
            }
            size={20}
            color="#059669"
          />
        </View>

        <View className="flex-1">
          <Text
            className="text-sm font-semibold text-slate-900"
            numberOfLines={1}
          >
            {reminder.title}
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            {formatTimeLabel(date)}
            {reminder.repeat === "none" ? "" : ` · ${repeatLabel}`}
          </Text>
          {reminder.notes ? (
            <Text
              className="mt-1 text-xs leading-4 text-slate-400"
              numberOfLines={2}
            >
              {reminder.notes}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <Pressable
        accessibilityLabel={`Delete reminder ${reminder.title}`}
        accessibilityRole="button"
        className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-slate-50 active:opacity-60"
        hitSlop={6}
        onPress={onDelete}
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={18}
          color="#DC2626"
        />
      </Pressable>
    </View>
  );
}
