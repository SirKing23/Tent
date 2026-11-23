import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { formatCurrencyWhole } from "../../../utils/currency";
import { getDueStatusLabel } from "../logic/dashboardData";
import type { DueStatus, PaymentAlert } from "../types";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const statusStyles: Record<
  DueStatus,
  { background: string; color: string; icon: IconName }
> = {
  overdue: {
    background: "#FFF1F2",
    color: "#E11D48",
    icon: "alert-circle-outline",
  },
  today: { background: "#FFFBEB", color: "#B45309", icon: "clock-alert-outline" },
  upcoming: { background: "#ECFDF5", color: "#047857", icon: "clock-outline" },
  none: {
    background: "#F1F5F9",
    color: "#475569",
    icon: "calendar-blank-outline",
  },
};

/** Wide enough for two thumb-sized actions on a 320pt phone. */
const CARD_WIDTH = 280;

function AlertCard({
  alert,
  isMarking,
  onRemind,
  onMarkPaid,
}: {
  alert: PaymentAlert;
  isMarking: boolean;
  onRemind: () => void;
  onMarkPaid: () => void;
}) {
  const badge = statusStyles[alert.status];

  return (
    <View
      className="rounded-2xl border border-slate-200 bg-white p-4"
      style={{ width: CARD_WIDTH }}
    >
      <View className="flex-row items-center justify-between">
        <View
          className="flex-row items-center rounded-full px-2.5 py-1"
          style={{ backgroundColor: badge.background }}
        >
          <MaterialCommunityIcons
            name={badge.icon}
            size={12}
            color={badge.color}
          />
          <Text
            className="ml-1 text-[10px] font-bold uppercase tracking-wide"
            style={{ color: badge.color }}
          >
            {getDueStatusLabel(alert.status, alert.daysUntilDue)}
          </Text>
        </View>
        <Text
          className="ml-2 text-lg font-bold text-slate-900"
          numberOfLines={1}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatCurrencyWhole(alert.amount)}
        </Text>
      </View>

      <Text
        className="mt-3 text-base font-semibold text-slate-900"
        numberOfLines={1}
      >
        {alert.tenantName}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
        {alert.unitLabel} • {alert.propertyName}
      </Text>

      <View className="mt-3 flex-row" style={{ gap: 8 }}>
        <Pressable
          accessibilityLabel={`Remind ${alert.tenantName}`}
          accessibilityRole="button"
          className="h-10 flex-1 flex-row items-center justify-center rounded-xl border border-slate-200 bg-slate-50 active:opacity-70"
          onPress={onRemind}
        >
          <MaterialCommunityIcons
            name="send-outline"
            size={15}
            color="#475569"
          />
          <Text className="ml-1.5 text-xs font-semibold text-slate-700">
            Remind
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel={`Mark ${alert.tenantName} as paid`}
          accessibilityRole="button"
          className="h-10 flex-1 flex-row items-center justify-center rounded-xl bg-emerald-600 active:opacity-80"
          disabled={isMarking}
          onPress={onMarkPaid}
          style={{ opacity: isMarking ? 0.7 : 1 }}
        >
          {isMarking ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={15}
                color="#FFFFFF"
              />
              <Text className="ml-1.5 text-xs font-semibold text-white">
                Mark Paid
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function AttentionSection({
  alerts,
  markingId,
  onRemind,
  onMarkPaid,
  onCreateBill,
  onOpenBillings,
}: {
  alerts: readonly PaymentAlert[];
  markingId: string | null;
  onRemind: (alert: PaymentAlert) => void;
  onMarkPaid: (alert: PaymentAlert) => void;
  onCreateBill: () => void;
  onOpenBillings: () => void;
}) {
  return (
    <View className="mt-7">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className="text-base font-bold text-slate-900">
            Attention Needed
          </Text>
          {alerts.length > 0 ? (
            <View className="ml-2 h-6 min-w-[24px] items-center justify-center rounded-full bg-amber-100 px-1.5">
              <Text className="text-[11px] font-bold text-amber-700">
                {alerts.length}
              </Text>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel="Create a new bill"
          accessibilityRole="button"
          className="flex-row items-center rounded-full px-2 py-1 active:opacity-60"
          onPress={onCreateBill}
        >
          <MaterialCommunityIcons name="plus" size={15} color="#059669" />
          <Text className="ml-0.5 text-xs font-semibold text-emerald-600">
            New Bill
          </Text>
        </Pressable>
      </View>

      {alerts.length === 0 ? (
        <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
            <MaterialCommunityIcons
              name="check-decagram-outline"
              size={22}
              color="#059669"
            />
          </View>
          <Text className="mt-2.5 text-sm font-semibold text-slate-900">
            No payments need attention
          </Text>
          <Text className="mt-1 text-center text-xs text-slate-500">
            Record rent and utility amounts in Monthly Billings to see overdue
            and upcoming collections here.
          </Text>
          <Pressable
            accessibilityLabel="Open monthly billings"
            accessibilityRole="button"
            className="mt-3 rounded-full bg-emerald-600 px-4 py-2 active:opacity-80"
            onPress={onOpenBillings}
          >
            <Text className="text-xs font-semibold text-white">
              Open Monthly Billings
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          contentContainerStyle={{ gap: 12, paddingRight: 4 }}
          showsHorizontalScrollIndicator={false}
        >
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isMarking={markingId === alert.id}
              onMarkPaid={() => onMarkPaid(alert)}
              onRemind={() => onRemind(alert)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
