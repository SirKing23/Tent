import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

import {
  formatShortDateLabel,
  formatTimeLabel,
  mergeDatePart,
  mergeTimePart,
} from "../logic/reminderCalendar";

type ReminderSchedulePickerProps = {
  value: Date;
  onChange: (next: Date) => void;
};

const pad = (value: number): string => String(value).padStart(2, "0");

const toDateInput = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toTimeInput = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Web has no native picker, so fall back to `type="date"`-style text fields. */
function WebScheduleInputs({ value, onChange }: ReminderSchedulePickerProps) {
  const [dateText, setDateText] = useState(() => toDateInput(value));
  const [timeText, setTimeText] = useState(() => toTimeInput(value));

  const handleDateText = (text: string) => {
    setDateText(text);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return;
    const parsed = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      value.getHours(),
      value.getMinutes(),
    );
    if (!Number.isNaN(parsed.getTime())) onChange(parsed);
  };

  const handleTimeText = (text: string) => {
    setTimeText(text);
    const match = /^(\d{2}):(\d{2})$/.exec(text);
    if (!match) return;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return;
    onChange(mergeTimePart(value, new Date(2000, 0, 1, hours, minutes)));
  };

  return (
    <View className="flex-row gap-3">
      <View className="flex-1">
        <Text className="mb-1.5 text-xs font-semibold text-slate-700">Date</Text>
        <TextInput
          accessibilityLabel="Reminder date"
          className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94A3B8"
          value={dateText}
          onChangeText={handleDateText}
        />
      </View>
      <View className="flex-1">
        <Text className="mb-1.5 text-xs font-semibold text-slate-700">Time</Text>
        <TextInput
          accessibilityLabel="Reminder time"
          className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
          placeholder="HH:MM"
          placeholderTextColor="#94A3B8"
          value={timeText}
          onChangeText={handleTimeText}
        />
      </View>
    </View>
  );
}

export function ReminderSchedulePicker({
  value,
  onChange,
}: ReminderSchedulePickerProps) {
  const [editing, setEditing] = useState<"date" | "time" | null>(null);

  const handleChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") setEditing(null);
    if (event.type === "dismissed" || !picked) return;
    onChange(
      editing === "date" ? mergeDatePart(value, picked) : mergeTimePart(value, picked),
    );
  };

  if (Platform.OS === "web") {
    return <WebScheduleInputs value={value} onChange={onChange} />;
  }

  if (Platform.OS === "ios") {
    return (
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1.5 text-xs font-semibold text-slate-700">
            Date
          </Text>
          <View className="h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3">
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={18}
              color="#475569"
            />
            <DateTimePicker
              value={value}
              mode="date"
              display="compact"
              accentColor="#059669"
              onChange={(event, picked) => {
                if (event.type !== "dismissed" && picked) {
                  onChange(mergeDatePart(value, picked));
                }
              }}
            />
          </View>
        </View>
        <View className="flex-1">
          <Text className="mb-1.5 text-xs font-semibold text-slate-700">
            Time
          </Text>
          <View className="h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3">
            <MaterialCommunityIcons
              name="clock-outline"
              size={18}
              color="#475569"
            />
            <DateTimePicker
              value={value}
              mode="time"
              display="compact"
              accentColor="#059669"
              onChange={(event, picked) => {
                if (event.type !== "dismissed" && picked) {
                  onChange(mergeTimePart(value, picked));
                }
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row gap-3">
      <Pressable
        accessibilityLabel="Choose reminder date"
        accessibilityRole="button"
        className="flex-1"
        onPress={() => setEditing("date")}
      >
        <Text className="mb-1.5 text-xs font-semibold text-slate-700">Date</Text>
        <View className="h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3">
          <Text className="text-sm text-slate-900">
            {formatShortDateLabel(value)}
          </Text>
          <MaterialCommunityIcons
            name="calendar-month-outline"
            size={19}
            color="#475569"
          />
        </View>
      </Pressable>

      <Pressable
        accessibilityLabel="Choose reminder time"
        accessibilityRole="button"
        className="flex-1"
        onPress={() => setEditing("time")}
      >
        <Text className="mb-1.5 text-xs font-semibold text-slate-700">Time</Text>
        <View className="h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3">
          <Text className="text-sm text-slate-900">
            {formatTimeLabel(value)}
          </Text>
          <MaterialCommunityIcons
            name="clock-outline"
            size={19}
            color="#475569"
          />
        </View>
      </Pressable>

      {editing ? (
        <DateTimePicker
          value={value}
          mode={editing}
          display="default"
          is24Hour={false}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}
