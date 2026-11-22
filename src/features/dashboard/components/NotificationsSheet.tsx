import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

import { BottomSheet } from "../../../../components/BottomSheet";
import { REMINDER_REPEAT_LABELS } from "../../../constants/reminders";
import { formatPesoWhole } from "../../../utils/currency";
import { formatTimeLabel } from "../../reminders/logic/reminderCalendar";
import type { Reminder } from "../../reminders/types";
import { getDueStatusLabel } from "../logic/dashboardData";
import type { PaymentAlert } from "../types";

const getSummary = (reminderCount: number, paymentCount: number): string => {
  if (reminderCount === 0 && paymentCount === 0) {
    return "You're all caught up.";
  }

  const parts: string[] = [];
  if (reminderCount > 0) {
    parts.push(`${reminderCount} reminder${reminderCount === 1 ? "" : "s"}`);
  }
  if (paymentCount > 0) {
    parts.push(`${paymentCount} payment${paymentCount === 1 ? "" : "s"}`);
  }

  const total = reminderCount + paymentCount;
  return `${parts.join(" and ")} ${total === 1 ? "needs" : "need"} attention.`;
};

const SECTION_LABEL =
  "mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-slate-400";

export function NotificationsSheet({
  visible,
  alerts,
  reminders,
  onClose,
  onOpenBillings,
  onOpenReminders,
}: {
  visible: boolean;
  alerts: readonly PaymentAlert[];
  reminders: readonly Reminder[];
  onClose: () => void;
  onOpenBillings: () => void;
  onOpenReminders: () => void;
}) {
  const isEmpty = alerts.length === 0 && reminders.length === 0;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900">Notifications</Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            {getSummary(reminders.length, alerts.length)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Close notifications"
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:opacity-70"
          onPress={onClose}
        >
          <MaterialCommunityIcons name="close" size={18} color="#475569" />
        </Pressable>
      </View>

      {isEmpty ? (
        <View className="items-center rounded-2xl bg-slate-50 px-5 py-6">
          <MaterialCommunityIcons
            name="bell-check-outline"
            size={26}
            color="#059669"
          />
          <Text className="mt-2 text-sm font-semibold text-slate-900">
            No pending notices
          </Text>
          <Text className="mt-1 text-center text-xs text-slate-500">
            Overdue payments and today’s reminders will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="max-h-[320px]"
          contentContainerStyle={{ paddingBottom: 4 }}
          showsVerticalScrollIndicator={false}
        >
          {reminders.length > 0 ? (
            <>
              <Text className={SECTION_LABEL}>Today’s reminders</Text>
              {reminders.map((reminder) => (
                <Pressable
                  key={reminder.id}
                  accessibilityLabel={`Open reminders, ${reminder.title} at ${formatTimeLabel(new Date(reminder.remindAt))}`}
                  accessibilityRole="button"
                  className="mb-2 flex-row items-center rounded-2xl bg-slate-50 px-3 py-2.5 active:opacity-70"
                  onPress={onOpenReminders}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                    <MaterialCommunityIcons
                      name={
                        reminder.repeat === "none"
                          ? "bell-outline"
                          : "bell-ring-outline"
                      }
                      size={17}
                      color="#059669"
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-sm font-semibold text-slate-900"
                      numberOfLines={1}
                    >
                      {reminder.title}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-slate-500">
                      {formatTimeLabel(new Date(reminder.remindAt))}
                      {reminder.repeat === "none"
                        ? ""
                        : ` · ${REMINDER_REPEAT_LABELS[reminder.repeat]}`}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color="#94A3B8"
                  />
                </Pressable>
              ))}
            </>
          ) : null}

          {alerts.length > 0 ? (
            <>
              <Text className={`${SECTION_LABEL} mt-1`}>Payments</Text>
              {alerts.map((alert) => (
                <View
                  key={alert.id}
                  className="mb-2 flex-row items-center rounded-2xl bg-slate-50 px-3 py-2.5"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-rose-100">
                    <MaterialCommunityIcons
                      name="clock-alert-outline"
                      size={17}
                      color="#E11D48"
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-sm font-semibold text-slate-900"
                      numberOfLines={1}
                    >
                      {alert.tenantName} • {alert.unitLabel}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-slate-500">
                      {getDueStatusLabel(alert.status, alert.daysUntilDue)} •{" "}
                      {formatPesoWhole(alert.amount)}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}

      <View className="mt-4 gap-2">
        {reminders.length > 0 ? (
          <Pressable
            accessibilityLabel="Open reminders"
            accessibilityRole="button"
            className="h-12 flex-row items-center justify-center rounded-xl bg-emerald-600 active:opacity-80"
            onPress={onOpenReminders}
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={18}
              color="#FFFFFF"
            />
            <Text className="ml-2 text-sm font-semibold text-white">
              Open Reminders
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityLabel="Open monthly billings"
          accessibilityRole="button"
          className={`h-12 flex-row items-center justify-center rounded-xl active:opacity-80 ${
            reminders.length > 0 ? "bg-slate-100" : "bg-emerald-600"
          }`}
          onPress={onOpenBillings}
        >
          <MaterialCommunityIcons
            name="calendar-month-outline"
            size={18}
            color={reminders.length > 0 ? "#334155" : "#FFFFFF"}
          />
          <Text
            className={`ml-2 text-sm font-semibold ${
              reminders.length > 0 ? "text-slate-700" : "text-white"
            }`}
          >
            Open Monthly Billings
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
