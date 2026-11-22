import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { BottomSheet } from "../../../../components/BottomSheet";
import {
  REMINDER_REPEATS,
  REMINDER_REPEAT_LABELS,
} from "../../../constants/reminders";
import {
  formatTimeLabel,
  validateReminderDraft,
} from "../logic/reminderCalendar";
import { REMINDER_ALERTS_SUPPORTED } from "../services/reminderNotifications";
import type { Reminder, ReminderDraft, ReminderRepeat } from "../types";
import { ReminderSchedulePicker } from "./ReminderSchedulePicker";

type ReminderEditorSheetProps = {
  visible: boolean;
  reminder: Reminder | null;
  defaultDate: Date;
  isSaving: boolean;
  onClose: () => void;
  onSave: (draft: ReminderDraft) => void;
  onDelete: (reminder: Reminder) => void;
};

type ReminderFormProps = Omit<ReminderEditorSheetProps, "visible">;

function ReminderForm({
  reminder,
  defaultDate,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: ReminderFormProps) {
  const [title, setTitle] = useState(reminder?.title ?? "");
  const [notes, setNotes] = useState(reminder?.notes ?? "");
  const [date, setDate] = useState(
    reminder ? new Date(reminder.remindAt) : defaultDate,
  );
  const [repeat, setRepeat] = useState<ReminderRepeat>(reminder?.repeat ?? "none");
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const draft: ReminderDraft = { title, notes, date, repeat };
    const validation = validateReminderDraft(draft);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    setError(null);
    onSave(draft);
  };

  return (
    <ScrollView
      bounces={false}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ maxHeight: 480 }}
    >
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-lg font-bold text-slate-900">
            {reminder ? "Edit reminder" : "New reminder"}
          </Text>
          <Text className="mt-0.5 text-xs leading-4 text-slate-500">
            {REMINDER_ALERTS_SUPPORTED
              ? "Your phone will sound and vibrate at the set time."
              : "Device alerts are available in the iOS and Android app."}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Close reminder editor"
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:opacity-70"
          onPress={onClose}
        >
          <MaterialCommunityIcons name="close" size={20} color="#475569" />
        </Pressable>
      </View>

      <Text className="mb-1.5 text-xs font-semibold text-slate-700">Title</Text>
      <TextInput
        accessibilityLabel="Reminder title"
        className="mb-1 h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
        placeholder="e.g. Collect rent from Unit 2"
        placeholderTextColor="#94A3B8"
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          if (error) setError(null);
        }}
        returnKeyType="done"
      />
      {error ? (
        <Text className="mb-3 mt-1 text-xs font-semibold text-red-600">
          {error}
        </Text>
      ) : (
        <View className="mb-3" />
      )}

      <Text className="mb-1.5 text-xs font-semibold text-slate-700">Notes</Text>
      <Text className="mb-1 text-[10px] uppercase text-slate-400">
        Optional
      </Text>
      <TextInput
        accessibilityLabel="Reminder notes"
        className="mb-4 min-h-[64px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        placeholder="Anything to remember when this fires"
        placeholderTextColor="#94A3B8"
        value={notes}
        onChangeText={setNotes}
        multiline
        textAlignVertical="top"
      />

      <ReminderSchedulePicker value={date} onChange={setDate} />

      <Text className="mb-1.5 mt-4 text-xs font-semibold text-slate-700">
        Repeat
      </Text>
      <View className="mb-1 flex-row flex-wrap gap-2">
        {REMINDER_REPEATS.map((option) => {
          const selected = option === repeat;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`rounded-full px-4 py-2 active:opacity-80 ${
                selected ? "bg-emerald-600" : "bg-slate-100"
              }`}
              onPress={() => setRepeat(option)}
            >
              <Text
                className={`text-xs font-bold ${
                  selected ? "text-white" : "text-slate-600"
                }`}
              >
                {REMINDER_REPEAT_LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mb-5 mt-1 text-[11px] leading-4 text-slate-500">
        {repeat === "none"
          ? "Alerts once at the date and time above."
          : `Alerts ${REMINDER_REPEAT_LABELS[repeat].toLowerCase()} at ${formatTimeLabel(date)}.`}
      </Text>

      <Pressable
        accessibilityLabel="Save reminder"
        accessibilityRole="button"
        className={`h-12 items-center justify-center rounded-xl bg-emerald-600 ${
          isSaving ? "opacity-60" : "active:opacity-80"
        }`}
        disabled={isSaving}
        onPress={handleSave}
      >
        <Text className="text-sm font-bold text-white">
          {isSaving ? "Saving…" : "Save reminder"}
        </Text>
      </Pressable>

      {reminder ? (
        <Pressable
          accessibilityLabel="Delete reminder"
          accessibilityRole="button"
          className="mt-2 h-11 items-center justify-center rounded-xl active:bg-red-50"
          disabled={isSaving}
          onPress={() => onDelete(reminder)}
        >
          <Text className="text-sm font-bold text-red-600">Delete reminder</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

export function ReminderEditorSheet({
  visible,
  ...formProps
}: ReminderEditorSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={formProps.onClose}>
      {visible ? <ReminderForm {...formProps} /> : null}
    </BottomSheet>
  );
}
