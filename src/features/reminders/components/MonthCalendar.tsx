import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { WEEKDAY_LABELS } from "../../../constants/reminders";
import {
  addMonths,
  daysWithReminders,
  formatMonthYear,
  getMonthGrid,
  isSameDay,
  isSameMonth,
} from "../logic/reminderCalendar";
import type { Reminder } from "../types";

type MonthCalendarProps = {
  month: Date;
  selectedDate: Date;
  reminders: Reminder[];
  onChangeMonth: (month: Date) => void;
  onSelectDate: (date: Date) => void;
};

export function MonthCalendar({
  month,
  selectedDate,
  reminders,
  onChangeMonth,
  onSelectDate,
}: MonthCalendarProps) {
  const days = useMemo(() => getMonthGrid(month), [month]);
  const counts = useMemo(
    () => daysWithReminders(reminders, days),
    [reminders, days],
  );
  const weeks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) =>
        days.slice(index * 7, index * 7 + 7),
      ),
    [days],
  );
  const today = new Date();

  return (
    <View className="rounded-3xl border border-slate-200 bg-white p-4">
      <View className="mb-3 flex-row items-center">
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center rounded-full bg-slate-50 active:opacity-70"
          onPress={() => onChangeMonth(addMonths(month, -1))}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color="#334155"
          />
        </Pressable>

        <Text className="flex-1 text-center text-base font-bold text-slate-900">
          {formatMonthYear(month)}
        </Text>

        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center rounded-full bg-slate-50 active:opacity-70"
          onPress={() => onChangeMonth(addMonths(month, 1))}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color="#334155"
          />
        </Pressable>

        {isSameMonth(month, today) ? null : (
          <Pressable
            accessibilityLabel="Jump to today"
            accessibilityRole="button"
            className="ml-2 rounded-full bg-emerald-50 px-2.5 py-1.5 active:opacity-70"
            onPress={() => onSelectDate(today)}
          >
            <Text className="text-[11px] font-bold text-emerald-700">Today</Text>
          </Pressable>
        )}
      </View>

      <View className="mb-1 flex-row items-center">
        {WEEKDAY_LABELS.map((label) => (
          <Text
            key={label}
            className="flex-1 text-center text-[11px] font-semibold text-slate-400"
          >
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} className="flex-row">
          {week.map((day) => {
            const inMonth = isSameMonth(day, month);
            const selected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            const count = counts.get(day.toDateString()) ?? 0;

            return (
              <Pressable
                key={day.toISOString()}
                accessibilityLabel={[
                  day.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  }),
                  count > 0
                    ? `${count} reminder${count === 1 ? "" : "s"}`
                    : "no reminders",
                ].join(", ")}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className="flex-1 items-center py-1 active:opacity-70"
                onPress={() => onSelectDate(day)}
              >
                <View
                  className={`h-9 w-9 items-center justify-center rounded-full ${
                    selected
                      ? "bg-emerald-600"
                      : isToday
                        ? "border border-emerald-500"
                        : ""
                  }`}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      selected
                        ? "text-white"
                        : inMonth
                          ? "text-slate-700"
                          : "text-slate-300"
                    }`}
                  >
                    {day.getDate()}
                  </Text>
                </View>
                <View className="mt-0.5 h-1.5 flex-row items-center">
                  {Array.from({ length: Math.min(count, 3) }, (_, index) => (
                    <View
                      key={index}
                      className={`mr-0.5 h-1.5 w-1.5 rounded-full ${
                        selected ? "bg-emerald-200" : "bg-emerald-500"
                      }`}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
