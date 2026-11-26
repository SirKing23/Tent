import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  formatCurrency,
  formatCurrencyWithSign,
  getActiveCurrency,
} from "../../../utils/currency";
import { formatPeriodLabel } from "../../../utils/period";
import { useReports } from "../hooks/useReports";
import {
  buildBillingHistory,
  buildCashbookHistory,
  buildMeterConsumptionHistory,
  getMeterReportOptions,
} from "../logic/reports";
import type { MonthlyReportPoint } from "../logic/reports";

type ReportKey = "consumption" | "billing" | "cashbook";

const reports: {
  key: ReportKey;
  label: string;
  icon: "water-outline" | "receipt-text-outline" | "book-outline";
}[] = [
  { key: "consumption", label: "Consumption", icon: "water-outline" },
  { key: "billing", label: "Billing", icon: "receipt-text-outline" },
  { key: "cashbook", label: "Cashbook", icon: "book-outline" },
];

const formatConsumption = (value: number, unit: string): string =>
  `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit}`;

const formatCompactCurrency = (value: number): string => {
  const compact = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return `${getActiveCurrency().symbol}${compact}`;
};

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <View className="min-w-[30%] flex-1 rounded-2xl border border-slate-100 bg-white p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </Text>
      <Text className="mt-1 text-base font-bold text-slate-900" numberOfLines={1}>
        {value}
      </Text>
      {detail ? (
        <Text className="mt-0.5 text-[10px] text-slate-500" numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

function MonthlyBarChart({
  data,
  primaryLabel,
  secondaryLabel,
  primaryColor = "#059669",
  secondaryColor = "#3B82F6",
  formatValue,
}: {
  data: readonly MonthlyReportPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  formatValue: (value: number) => string;
}) {
  const maximum = Math.max(
    1,
    ...data.flatMap((point) => [point.primary, point.secondary]),
  );

  return (
    <View className="rounded-2xl border border-slate-100 bg-white p-4">
      <Text className="text-base font-bold text-slate-900">Monthly trend</Text>
      <View className="mt-3 flex-row items-center gap-4">
        <ChartLegend color={primaryColor} label={primaryLabel} />
        {secondaryLabel ? (
          <ChartLegend color={secondaryColor} label={secondaryLabel} />
        ) : null}
      </View>
      <ScrollView
        className="mt-4"
        contentContainerStyle={{ minWidth: Math.max(data.length * 44, 320) }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View className="flex-row items-end justify-between">
          {data.map((point) => {
            const primaryHeight = (point.primary / maximum) * 92;
            const secondaryHeight = (point.secondary / maximum) * 92;
            const monthLabel = formatPeriodLabel(point.period)
              .split(" ")[0]
              .slice(0, 3);

            return (
              <View
                key={point.period}
                accessibilityLabel={`${formatPeriodLabel(point.period)}: ${formatValue(point.primary)}${secondaryLabel ? `, ${formatValue(point.secondary)}` : ""}`}
                className="items-center"
                style={{ width: 40 }}
              >
                <View className="mb-1 h-5 justify-end">
                  <Text
                    className="text-[8px] font-medium text-slate-500"
                    adjustsFontSizeToFit
                    numberOfLines={1}
                  >
                    {point.primary > 0 ? formatValue(point.primary) : ""}
                  </Text>
                </View>
                <View
                  className="h-[92px] w-full flex-row items-end justify-center gap-1"
                  accessibilityRole="image"
                >
                  <View
                    className="w-3 rounded-t-sm"
                    style={{
                      height: primaryHeight,
                      minHeight: point.primary > 0 ? 2 : 0,
                      backgroundColor: primaryColor,
                    }}
                  />
                  {secondaryLabel ? (
                    <View
                      className="w-3 rounded-t-sm"
                      style={{
                        height: secondaryHeight,
                        minHeight: point.secondary > 0 ? 2 : 0,
                        backgroundColor: secondaryColor,
                      }}
                    />
                  ) : null}
                </View>
                <Text className="mt-2 text-[10px] font-medium text-slate-500">
                  {monthLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center">
      <View
        className="mr-1.5 h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Text className="text-xs text-slate-600">{label}</Text>
    </View>
  );
}

function FilterChips({
  label,
  items,
  selectedId,
  onSelect,
}: {
  label: string;
  items: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-2 text-xs font-semibold text-slate-500">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`mr-2 rounded-full border px-3 py-2 ${
                selected
                  ? "border-emerald-600 bg-emerald-600"
                  : "border-slate-200 bg-white"
              }`}
              onPress={() => onSelect(item.id)}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected ? "text-white" : "text-slate-600"
                }`}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function EmptyReport({ message }: { message: string }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10">
      <MaterialCommunityIcons
        name="chart-box-outline"
        size={30}
        color="#94A3B8"
      />
      <Text className="mt-3 text-center text-sm font-semibold text-slate-700">
        No report data yet
      </Text>
      <Text className="mt-1 text-center text-xs leading-5 text-slate-500">
        {message}
      </Text>
    </View>
  );
}

export function ReportsScreen() {
  const { data, error, isLoading, refresh } = useReports();
  const [activeReport, setActiveReport] = useState<ReportKey>("consumption");
  const [requestedPropertyId, setRequestedPropertyId] = useState("");
  const [requestedBillId, setRequestedBillId] = useState("");

  const meterOptions = useMemo(
    () => getMeterReportOptions(data?.meterReadings ?? []),
    [data?.meterReadings],
  );
  const propertyOptions = useMemo(() => {
    const properties = new Map(
      meterOptions.map((option) => [
        option.propertyId,
        { id: option.propertyId, name: option.propertyName },
      ]),
    );
    return [...properties.values()].sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }, [meterOptions]);
  const selectedPropertyId = propertyOptions.some(
    (property) => property.id === requestedPropertyId,
  )
    ? requestedPropertyId
    : (propertyOptions[0]?.id ?? "");
  const billOptions = meterOptions.filter(
    (option) => option.propertyId === selectedPropertyId,
  );
  const selectedBillId = billOptions.some(
    (option) => option.billingItemId === requestedBillId,
  )
    ? requestedBillId
    : (billOptions[0]?.billingItemId ?? "");
  const selectedMeter = billOptions.find(
    (option) => option.billingItemId === selectedBillId,
  );

  const meterHistory = data
    ? buildMeterConsumptionHistory(
        data.meterReadings,
        selectedPropertyId,
        selectedBillId,
      )
    : [];
  const billingHistory = useMemo(
    () =>
      data
        ? buildBillingHistory({
            properties: data.properties,
            bills: data.bills,
            tenants: data.tenants,
            entries: data.monthlyBillEntries,
            monthlyOnlyBills: data.monthlyOnlyBills,
          })
        : [],
    [data],
  );
  const cashbookHistory = useMemo(
    () =>
      data ? buildCashbookHistory(data.cashbooks, data.cashbookEntries) : [],
    [data],
  );

  const meterTotal = meterHistory.reduce(
    (total, point) => total + point.primary,
    0,
  );
  const latestBilling = billingHistory.at(-1);
  const billingOutstanding = latestBilling
    ? latestBilling.primary - latestBilling.secondary
    : 0;
  const latestCashbook = cashbookHistory.at(-1);
  const cashbookNet = latestCashbook
    ? latestCashbook.primary - latestCashbook.secondary
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="flex-row items-center border-b border-slate-200 bg-white px-4 pb-3 pt-2">
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-100"
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={21}
            color="#334155"
          />
        </Pressable>
        <View>
          <Text className="text-2xl font-bold text-slate-900">Reports</Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            Monthly trends from your saved records
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#059669" size="large" />
          <Text className="mt-3 text-sm text-slate-500">
            Loading your reports…
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-slate-600">{error}</Text>
          <Pressable
            accessibilityRole="button"
            className="mt-4 rounded-full bg-emerald-600 px-5 py-3"
            onPress={() => void refresh()}
          >
            <Text className="text-sm font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            className="mb-5"
            contentContainerStyle={{ gap: 8 }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {reports.map((report) => {
              const selected = activeReport === report.key;
              return (
                <Pressable
                  key={report.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={`flex-row items-center rounded-full border px-4 py-2.5 ${
                    selected
                      ? "border-emerald-600 bg-emerald-600"
                      : "border-slate-200 bg-white"
                  }`}
                  onPress={() => setActiveReport(report.key)}
                >
                  <MaterialCommunityIcons
                    name={report.icon}
                    size={16}
                    color={selected ? "#FFFFFF" : "#64748B"}
                  />
                  <Text
                    className={`ml-2 text-xs font-semibold ${
                      selected ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {report.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {activeReport === "consumption" ? (
            <View>
              <View className="mb-4">
                <Text className="text-lg font-bold text-slate-900">
                  Monthly consumption
                </Text>
                <Text className="mt-1 text-xs leading-5 text-slate-500">
                  Meter readings show the change from the previous reading.
                  Total-consumption bills use the saved monthly value.
                </Text>
              </View>
              {meterOptions.length === 0 ? (
                <EmptyReport message="Save a meter reading or total-consumption bill to see its month-by-month usage here." />
              ) : (
                <>
                  <FilterChips
                    label="Property"
                    items={propertyOptions}
                    selectedId={selectedPropertyId}
                    onSelect={(id) => {
                      setRequestedPropertyId(id);
                      setRequestedBillId("");
                    }}
                  />
                  <FilterChips
                    label="Bill"
                    items={billOptions.map((option) => ({
                      id: option.billingItemId,
                      name: option.billName,
                    }))}
                    selectedId={selectedBillId}
                    onSelect={setRequestedBillId}
                  />
                  {selectedMeter ? (
                    <>
                      <View className="mb-4 flex-row gap-3">
                        <StatCard
                          label="12-month total"
                          value={formatConsumption(
                            meterTotal,
                            selectedMeter.displayUnit || "units",
                          )}
                          detail={selectedMeter.utilityType}
                        />
                        <StatCard
                          label="Latest month"
                          value={formatConsumption(
                            meterHistory.at(-1)?.primary ?? 0,
                            selectedMeter.displayUnit || "units",
                          )}
                          detail={
                            meterHistory.length
                              ? formatPeriodLabel(
                                  meterHistory[meterHistory.length - 1].period,
                                )
                              : "No recorded months"
                          }
                        />
                      </View>
                      <MonthlyBarChart
                        data={meterHistory}
                        primaryLabel={`Usage (${selectedMeter.displayUnit || "units"})`}
                        formatValue={(value) =>
                          value.toLocaleString("en-US", {
                            maximumFractionDigits: 2,
                          })
                        }
                      />
                    </>
                  ) : null}
                </>
              )}
            </View>
          ) : null}

          {activeReport === "billing" ? (
            <View>
              <View className="mb-4">
                <Text className="text-lg font-bold text-slate-900">
                  Billing & payments
                </Text>
                <Text className="mt-1 text-xs leading-5 text-slate-500">
                  Amounts marked paid are based on each bill’s saved payment
                  status. Building invoices and independent unit bills are
                  counted once.
                </Text>
              </View>
              {billingHistory.length === 0 ? (
                <EmptyReport message="Record monthly bill amounts or payments to build a billing history." />
              ) : (
                <>
                  <View className="mb-4 flex-row gap-3">
                    <StatCard
                      label="Latest billed"
                      value={formatCurrency(latestBilling?.primary ?? 0)}
                      detail={
                        latestBilling
                          ? formatPeriodLabel(latestBilling.period)
                          : undefined
                      }
                    />
                    <StatCard
                      label="Marked paid"
                      value={formatCurrency(latestBilling?.secondary ?? 0)}
                    />
                    <StatCard
                      label="Outstanding"
                      value={formatCurrency(billingOutstanding)}
                    />
                  </View>
                  <MonthlyBarChart
                    data={billingHistory}
                    primaryLabel="Billed"
                    secondaryLabel="Marked paid"
                    secondaryColor="#3B82F6"
                    formatValue={formatCompactCurrency}
                  />
                </>
              )}
            </View>
          ) : null}

          {activeReport === "cashbook" ? (
            <View>
              <View className="mb-4">
                <Text className="text-lg font-bold text-slate-900">
                  Cashbook flow
                </Text>
                <Text className="mt-1 text-xs leading-5 text-slate-500">
                  Monthly cash-in and cash-out totals from registered cashbooks.
                  Opening balances are not assigned to a transaction month.
                </Text>
              </View>
              {cashbookHistory.length === 0 ? (
                <EmptyReport message="Add dated cash-in or cash-out entries to see monthly cashbook activity." />
              ) : (
                <>
                  <View className="mb-4 flex-row gap-3">
                    <StatCard
                      label="Latest cash in"
                      value={formatCurrency(latestCashbook?.primary ?? 0)}
                      detail={
                        latestCashbook
                          ? formatPeriodLabel(latestCashbook.period)
                          : undefined
                      }
                    />
                    <StatCard
                      label="Latest cash out"
                      value={formatCurrency(latestCashbook?.secondary ?? 0)}
                    />
                    <StatCard
                      label="Net flow"
                      value={formatCurrencyWithSign(cashbookNet)}
                    />
                  </View>
                  <MonthlyBarChart
                    data={cashbookHistory}
                    primaryLabel="Cash in"
                    secondaryLabel="Cash out"
                    secondaryColor="#F97316"
                    formatValue={formatCompactCurrency}
                  />
                </>
              )}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
