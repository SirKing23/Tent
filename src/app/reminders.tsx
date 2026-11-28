import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../features/auth/hooks/useAuth";
import {
  countBillRemindersForDay,
  getBillReminderOccurrencesForDay,
} from "../features/bills/logic/billReminders";
import { BillReminderCard } from "../features/reminders/components/BillReminderCard";
import { MonthCalendar } from "../features/reminders/components/MonthCalendar";
import { ReminderCard } from "../features/reminders/components/ReminderCard";
import { ReminderEditorSheet } from "../features/reminders/components/ReminderEditorSheet";
import { useReminders } from "../features/reminders/hooks/useReminders";
import {
  buildReminder,
  getDefaultReminderDate,
  getRemindersForDay,
  isSameDay,
  isSameMonth,
  moveToMonth,
  startOfDay,
  startOfMonth,
} from "../features/reminders/logic/reminderCalendar";
import {
  REMINDER_ALERTS_SUPPORTED,
  requestReminderNotificationPermission,
} from "../features/reminders/services/reminderNotifications";
import type { Reminder, ReminderDraft } from "../features/reminders/types";
import { formatDateLong } from "../utils/date";

export default function RemindersScreen() {
  const { reminders, bills, isLoading, isSaving, save, remove } = useReminders();
  const { runWithoutAutoLock } = useAuth();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const defaultDate = useMemo(
    () => getDefaultReminderDate(selectedDate),
    [selectedDate],
  );

  const dayReminders = useMemo(
    () => getRemindersForDay(reminders, selectedDate),
    [reminders, selectedDate],
  );

  // Bill reminders are derived from the bills themselves, so they never drift
  // from the due-date settings the bill form owns.
  const billDayReminders = useMemo(
    () => getBillReminderOccurrencesForDay(bills, selectedDate),
    [bills, selectedDate],
  );

  const billReminderCounts = useCallback(
    (day: Date) => countBillRemindersForDay(bills, day),
    [bills],
  );

  const totalCount = dayReminders.length + billDayReminders.length;
  const selectedIsToday = isSameDay(selectedDate, new Date());
  const dateLabel = formatDateLong(selectedDate);
  const countLabel =
    totalCount === 0
      ? "No reminders scheduled"
      : `${totalCount} reminder${totalCount === 1 ? "" : "s"}`;

  const openNewReminder = useCallback(() => {
    setEditingReminder(null);
    setIsEditorVisible(true);
  }, []);

  const openReminder = useCallback((reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsEditorVisible(true);
  }, []);

  const closeEditor = useCallback(() => {
    setIsEditorVisible(false);
    setEditingReminder(null);
  }, []);

  const handleSelectDate = useCallback((value: Date) => {
    setSelectedDate(startOfDay(value));
    setVisibleMonth((current) =>
      isSameMonth(value, current) ? current : startOfMonth(value),
    );
  }, []);

  const handleChangeMonth = useCallback((next: Date) => {
    setVisibleMonth(next);
    setSelectedDate((current) => moveToMonth(current, next));
  }, []);

  const handleSave = useCallback(
    async (draft: ReminderDraft) => {
      const reminder = buildReminder(draft, editingReminder ?? undefined);
      // The system permission prompt puts Tent in the background; it must not
      // be mistaken for the user leaving the app.
      const canAlert = await runWithoutAutoLock(() =>
        requestReminderNotificationPermission(),
      );

      await save(reminder);
      setSelectedDate(startOfDay(draft.date));
      setVisibleMonth(startOfMonth(draft.date));
      closeEditor();

      if (!canAlert && REMINDER_ALERTS_SUPPORTED) {
        Alert.alert(
          "Alerts are turned off",
          "The reminder was saved, but this device can't sound or vibrate. Allow notifications for this app in your system settings.",
        );
      }
    },
    [closeEditor, editingReminder, runWithoutAutoLock, save],
  );

  const handleDelete = useCallback(
    (reminder: Reminder) => {
      Alert.alert(
        "Delete reminder?",
        `"${reminder.title}" will be removed from your calendar.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                await remove(reminder.id);
                if (editingReminder?.id === reminder.id) closeEditor();
              })();
            },
          },
        ],
      );
    },
    [closeEditor, editingReminder?.id, remove],
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fc]" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "Reminders" }} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <MonthCalendar
          extraCountForDay={billReminderCounts}
          month={visibleMonth}
          onSelectDate={handleSelectDate}
          onChangeMonth={handleChangeMonth}
          reminders={reminders}
          selectedDate={selectedDate}
        />

        <View className="mb-3 mt-5 flex-row items-end justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-emerald-700">
              {selectedIsToday ? "Today" : "Selected day"}
            </Text>
            <Text className="mt-1 text-lg font-bold text-slate-900">
              {dateLabel}
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">{countLabel}</Text>
          </View>

          <Pressable
            accessibilityLabel="Create reminder"
            accessibilityRole="button"
            className="flex-row items-center rounded-full bg-emerald-600 px-4 py-2.5 active:opacity-80"
            onPress={openNewReminder}
          >
            <MaterialCommunityIcons name="plus" size={17} color="#FFFFFF" />
            <Text className="ml-1 text-xs font-bold text-white">New</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#059669" />
          </View>
        ) : totalCount === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10">
            <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <MaterialCommunityIcons
                name="bell-plus-outline"
                size={28}
                color="#059669"
              />
            </View>
            <Text className="text-base font-bold text-slate-900">
              Nothing scheduled
            </Text>
            <Text className="mt-1 text-center text-xs leading-5 text-slate-500">
              Add a reminder for {dateLabel} and your phone will alert you on
              time.
            </Text>
            <Pressable
              accessibilityLabel="Add reminder for selected day"
              accessibilityRole="button"
              className="mt-4 rounded-full bg-emerald-600 px-5 py-2.5 active:opacity-80"
              onPress={openNewReminder}
            >
              <Text className="text-xs font-bold text-white">Add reminder</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {dayReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onDelete={() => handleDelete(reminder)}
                onPress={() => openReminder(reminder)}
              />
            ))}
            {billDayReminders.map((occurrence) => (
              <BillReminderCard
                key={`${occurrence.bill.id}-${occurrence.slot.offset}-${occurrence.date.getTime()}`}
                occurrence={occurrence}
                onPress={() =>
                  router.push({
                    pathname: "/bills-AddNewBill",
                    params: { id: occurrence.bill.id },
                  })
                }
              />
            ))}
          </>
        )}
      </ScrollView>

      <ReminderEditorSheet
        defaultDate={defaultDate}
        isSaving={isSaving}
        onClose={closeEditor}
        onDelete={handleDelete}
        onSave={(draft) => void handleSave(draft)}
        reminder={editingReminder}
        visible={isEditorVisible}
      />
    </SafeAreaView>
  );
}
