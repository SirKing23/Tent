import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { formatPesoWhole } from "../../../utils/currency";
import { filterActivity, formatRelativeTime } from "../logic/dashboardData";
import type {
  ActivityDirection,
  ActivityEntry,
  ActivityFilter,
} from "../types";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "cashbook", label: "Cash Notebooks" },
  { key: "bill", label: "Bills" },
];

const directionStyles: Record<
  ActivityDirection,
  {
    background: string;
    color: string;
    icon: IconName;
    textClass: string;
    prefix: string;
  }
> = {
  in: {
    background: "#ECFDF5",
    color: "#059669",
    icon: "arrow-down-left",
    textClass: "text-emerald-600",
    prefix: "+",
  },
  out: {
    background: "#FFF1F2",
    color: "#E11D48",
    icon: "arrow-up-right",
    textClass: "text-rose-600",
    prefix: "−",
  },
  pending: {
    background: "#FFFBEB",
    color: "#B45309",
    icon: "receipt-text-outline",
    textClass: "text-amber-600",
    prefix: "",
  },
};

export function ActivityFeed({
  activity,
  onOpenCashbooks,
}: {
  activity: readonly ActivityEntry[];
  onOpenCashbooks: () => void;
}) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const visible = useMemo(() => filterActivity(activity, filter), [
    activity,
    filter,
  ]);

  return (
    <View className="mt-7">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-bold text-slate-900">
          Recent Activity
        </Text>
        <Pressable
          accessibilityLabel="Open cash notebooks"
          accessibilityRole="button"
          className="rounded-full px-2 py-1 active:opacity-60"
          onPress={onOpenCashbooks}
        >
          <Text className="text-xs font-semibold text-emerald-600">
            View notebooks
          </Text>
        </Pressable>
      </View>

      <View className="mb-3 flex-row" style={{ gap: 8 }}>
        {FILTERS.map((item) => {
          const isActive = filter === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              className={`rounded-full border px-3 py-1.5 ${
                isActive
                  ? "border-emerald-600 bg-emerald-600"
                  : "border-slate-200 bg-white"
              } active:opacity-70`}
              onPress={() => setFilter(item.key)}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? "text-white" : "text-slate-600"
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {visible.length === 0 ? (
        <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-slate-100">
            <MaterialCommunityIcons
              name="text-box-search-outline"
              size={22}
              color="#94A3B8"
            />
          </View>
          <Text className="mt-2.5 text-sm font-semibold text-slate-900">
            Nothing recorded yet
          </Text>
          <Text className="mt-1 text-center text-xs text-slate-500">
            Cash in, cash out, and generated tenant bills will appear here.
          </Text>
        </View>
      ) : (
        <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {visible.map((item, index) => {
            const tone = directionStyles[item.direction];
            return (
              <View
                key={item.id}
                className={`flex-row items-center px-4 py-3 ${
                  index > 0 ? "border-t border-slate-100" : ""
                }`}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: tone.background }}
                >
                  <MaterialCommunityIcons
                    name={tone.icon}
                    size={17}
                    color={tone.color}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className="text-sm font-semibold text-slate-900"
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    className="mt-0.5 text-[11px] text-slate-500"
                    numberOfLines={1}
                  >
                    {item.tag} • {formatRelativeTime(item.occurredAt)}
                  </Text>
                </View>
                <Text
                  className={`ml-2 text-sm font-bold ${tone.textClass}`}
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {tone.prefix}
                  {formatPesoWhole(item.amount)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
