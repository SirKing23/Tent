import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MonthlyBillDialogs } from "../features/monthlyBilling/components/MonthlyBillDialogs";
import { UnitBillingCard } from "../features/monthlyBilling/components/PropertyBillingCard";
import { useMonthlyBillDialogs } from "../features/monthlyBilling/hooks/useMonthlyBillDialogs";
import { getPropertyAddress } from "../features/properties/logic/propertyRules";
import { formatCurrency } from "../utils/currency";
import { formatPeriodLabel, getCurrentPeriod } from "../utils/period";

export default function MonthlyBillingUnitsScreen() {
  const { buildingId, period: periodParam } = useLocalSearchParams<{
    buildingId?: string;
    period?: string;
  }>();
  const period = periodParam ?? getCurrentPeriod();
  const dialogs = useMonthlyBillDialogs(period);
  const { report, isLoading, refresh } = dialogs;
  const billing = report.buildings.find(
    (item) => item.property.id === buildingId,
  );
  const summary = billing?.unitSummary;

  const rateFor = (billingItemId: string) =>
    billing?.lines.find((line) => line.bill.id === billingItemId)?.rate;

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fc]" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "Unit bills" }} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void refresh()}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {!billing ? (
          <View className="items-center rounded-[24px] border border-[#e4eaf2] bg-white px-6 py-12">
            <MaterialCommunityIcons
              color="#4C45F5"
              name="door-closed"
              size={30}
            />
            <Text className="mt-3 text-[15px] font-extrabold text-[#1a2b44]">
              Building not found
            </Text>
            <Text className="mt-1 text-center text-[12px] text-[#7890ae]">
              This building may have been removed.
            </Text>
          </View>
        ) : (
          <>
            <View className="mb-4 rounded-[24px] border border-[#e4eaf2] bg-white p-4">
              <View className="flex-row items-center justify-between">
                <View className="min-w-0 flex-1 pr-3">
                  <Text className="text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
                    {billing.property.type}
                  </Text>
                  <Text
                    className="text-[18px] font-extrabold text-[#0d162a]"
                    numberOfLines={1}
                  >
                    {billing.property.name}
                  </Text>
                  <Text
                    className="text-[12px] text-[#637b99]"
                    numberOfLines={1}
                  >
                    {getPropertyAddress(billing.property) || "No address added"}
                  </Text>
                </View>
                <View className="rounded-full bg-[#EBECFF] px-3 py-1">
                  <Text className="text-[11px] font-bold text-[#4C45F5]">
                    {formatPeriodLabel(period)}
                  </Text>
                </View>
              </View>

              <View className="mt-3 flex-row gap-2">
                <UnitStat
                  label="Units"
                  value={String(summary?.unitCount ?? 0)}
                />
                <UnitStat
                  label="Paid"
                  value={String(summary?.paidCount ?? 0)}
                  valueClassName="text-[#047857]"
                />
                <UnitStat
                  label="Unpaid"
                  value={String(summary?.unpaidCount ?? 0)}
                  valueClassName="text-[#B45309]"
                />
                <UnitStat
                  label="Unit bills"
                  value={formatCurrency(summary?.total ?? 0)}
                />
              </View>
            </View>

            {billing.units.length === 0 ? (
              <View className="items-center rounded-[24px] border border-[#e4eaf2] bg-white px-6 py-12">
                <MaterialCommunityIcons
                  color="#4C94F5"
                  name="door-open"
                  size={30}
                />
                <Text className="mt-3 text-[15px] font-extrabold text-[#1a2b44]">
                  No units yet
                </Text>
                <Text className="mt-1 text-center text-[12px] text-[#7890ae]">
                  Add units under this building to track their bills here.
                </Text>
              </View>
            ) : (
              billing.units.map((unit) => (
                <UnitBillingCard
                  key={unit.property.id}
                  oneOffBillIds={dialogs.monthlyOnlyBillIds}
                  onManageBill={(property, line) =>
                    dialogs.openOneOffActions(property, line.bill)
                  }
                  onPressBill={(property, line) =>
                    dialogs.openUnitBill(property, line, rateFor(line.bill.id))
                  }
                  onShare={() => dialogs.openUnitShare(unit)}
                  unit={unit}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <MonthlyBillDialogs dialogs={dialogs} />
    </SafeAreaView>
  );
}

function UnitStat({
  label,
  value,
  valueClassName = "text-[#0d162a]",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="flex-1 rounded-xl bg-[#f8fafc] px-2 py-2">
      <Text className="text-[9px] font-semibold uppercase text-[#8091b1]">
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit
        className={`mt-0.5 text-[12px] font-extrabold ${valueClassName}`}
        minimumFontScale={0.7}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
