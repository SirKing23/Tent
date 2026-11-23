import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, View } from "react-native";

import { formatCurrencyWhole } from "../../../utils/currency";
import type { DashboardMetrics } from "../types";

const tabularNums = { fontVariant: ["tabular-nums" as const] };

function GlassMetric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-white/10 bg-white/10 p-3">
      <View className="flex-row items-center">
        <MaterialCommunityIcons name={icon} size={13} color="#6EE7B7" />
        <Text
          className="ml-1.5 flex-1 text-[10px] font-medium uppercase tracking-wide text-slate-300"
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Text
        className="mt-1.5 text-sm font-bold text-white"
        numberOfLines={1}
        style={tabularNums}
      >
        {value}
      </Text>
    </View>
  );
}

export function PortfolioHeroCard({
  metrics,
  monthLabel,
}: {
  metrics: DashboardMetrics;
  monthLabel: string;
}) {
  const progressPercent = Math.round(metrics.progress * 100);
  const occupancyValue =
    metrics.totalUnits > 0
      ? `${metrics.occupiedUnits}/${metrics.totalUnits} Units • ${metrics.occupancyRate}%`
      : "No units yet";

  return (
    <View
      className="overflow-hidden rounded-[28px] bg-[#0F172A] p-5"
      style={styles.hero}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <MaterialCommunityIcons
              name="wallet-outline"
              size={18}
              color="#34D399"
            />
          </View>
          <Text
            className="ml-2.5 flex-1 text-xs font-medium text-slate-300"
            numberOfLines={2}
          >
            {monthLabel} Rent Collected
          </Text>
        </View>
        <View className="ml-3 flex-row items-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
          <MaterialCommunityIcons
            name="account-multiple-outline"
            size={13}
            color="#6EE7B7"
          />
          <Text className="ml-1.5 text-[11px] font-semibold text-white">
            {metrics.totalUnits > 0
              ? `${metrics.occupiedUnits}/${metrics.totalUnits} Units`
              : "No units"}
          </Text>
        </View>
      </View>

      <Text
        className="mt-4 text-[40px] font-bold leading-[46px] tracking-tight text-white"
        style={tabularNums}
      >
        {formatCurrencyWhole(metrics.collected)}
      </Text>
      <Text className="mt-1 text-sm text-slate-400">
        of {formatCurrencyWhole(metrics.target)} target
      </Text>

      <View className="mt-5 flex-row items-center justify-between">
        <Text className="text-xs font-medium text-slate-300">
          {progressPercent}% collected
        </Text>
        <Text className="text-xs font-semibold text-amber-300">
          {formatCurrencyWhole(metrics.pending)} pending
        </Text>
      </View>
      <View className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <View
          className="h-full rounded-full bg-emerald-400"
          style={{ width: `${progressPercent}%` }}
        />
      </View>

      <View className="mt-4 flex-row" style={{ gap: 10 }}>
        <GlassMetric
          icon="account-multiple-outline"
          label="Occupancy Rate"
          value={occupancyValue}
        />
        <GlassMetric
          icon="alert-circle-outline"
          label="Pending Collectibles"
          value={formatCurrencyWhole(metrics.pending)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
});
