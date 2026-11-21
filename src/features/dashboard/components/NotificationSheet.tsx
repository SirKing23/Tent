import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

import { BottomSheet } from "../../../../components/BottomSheet";
import { formatPesoWhole } from "../../../utils/currency";
import { getDueStatusLabel } from "../logic/dashboardData";
import type { PaymentAlert } from "../types";

export function NotificationSheet({
  visible,
  alerts,
  onClose,
  onOpenBillings,
}: {
  visible: boolean;
  alerts: readonly PaymentAlert[];
  onClose: () => void;
  onOpenBillings: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900">Notifications</Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            {alerts.length === 0
              ? "You're all caught up."
              : `${alerts.length} ${alerts.length === 1 ? "payment needs" : "payments need"} attention.`}
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

      {alerts.length === 0 ? (
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
            Overdue and upcoming tenant payments will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="max-h-[320px]"
          contentContainerStyle={{ paddingBottom: 4 }}
          showsVerticalScrollIndicator={false}
        >
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
        </ScrollView>
      )}

      <Pressable
        accessibilityLabel="Open monthly billings"
        accessibilityRole="button"
        className="mt-4 h-12 flex-row items-center justify-center rounded-xl bg-emerald-600 active:opacity-80"
        onPress={onOpenBillings}
      >
        <MaterialCommunityIcons
          name="calendar-month-outline"
          size={18}
          color="#FFFFFF"
        />
        <Text className="ml-2 text-sm font-semibold text-white">
          Open Monthly Billings
        </Text>
      </Pressable>
    </BottomSheet>
  );
}
