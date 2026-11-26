import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  type ScrollViewInstance,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "../../../global.css";
import { AttentionHighlight } from "../../features/monthlyBilling/components/AttentionHighlight";
import { BillTargetPickerModal } from "../../features/monthlyBilling/components/BillTargetPickerModal";
import { MonthlyBillDialogs } from "../../features/monthlyBilling/components/MonthlyBillDialogs";
import { MonthlyBillingSummary } from "../../features/monthlyBilling/components/MonthlyBillingSummary";
import {
  PropertyBillingCard,
  UnitBillingCard,
} from "../../features/monthlyBilling/components/PropertyBillingCard";
import { PeriodSwitcher } from "../../features/monthlyBilling/components/PeriodSwitcher";
import { useMonthlyBillDialogs } from "../../features/monthlyBilling/hooks/useMonthlyBillDialogs";
import { resolveBillingHighlight } from "../../features/monthlyBilling/logic/monthlyBilling";
import type { Property } from "../../features/properties/types";
import { getCurrentPeriod } from "../../utils/period";

export default function MonthlyBillingsScreen() {
  const router = useRouter();
  const {
    highlightToken,
    highlightUnitId,
    period: periodParam,
  } = useLocalSearchParams<{
    highlightToken?: string;
    highlightUnitId?: string;
    period?: string;
  }>();
  const navToken = highlightUnitId
    ? (highlightToken ?? highlightUnitId)
    : null;
  const [periodChoice, setPeriodChoice] = useState<{
    token: string | null;
    period: string;
  } | null>(null);
  // A fresh navigation from Home resets the period to the one it was built for.
  const period =
    periodChoice?.token === navToken
      ? periodChoice.period
      : (periodParam ?? getCurrentPeriod());

  const [dismissedToken, setDismissedToken] = useState<string | null>(null);
  const highlightedUnitId =
    navToken && navToken !== dismissedToken ? (highlightUnitId ?? null) : null;

  const scrollRef = useRef<ScrollViewInstance>(null);
  const dialogs = useMonthlyBillDialogs(period);
  const { report, properties, isLoading, refresh } = dialogs;
  const [showBillTargetPicker, setShowBillTargetPicker] = useState(false);

  const highlightTarget = useMemo(
    () =>
      highlightedUnitId
        ? resolveBillingHighlight(report, highlightedUnitId)
        : null,
    [highlightedUnitId, report],
  );

  const clearHighlight = useCallback(
    () => setDismissedToken(navToken),
    [navToken],
  );

  const openUnits = (property: Property) =>
    router.push({
      pathname: "/monthlyBilling-units",
      params: { buildingId: property.id, period },
    });

  const hasProperties = report.buildings.length > 0 || report.units.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fc]" edges={["top"]}>
      <View className="px-4 pb-2 pt-2">
        <View className="flex-row items-start justify-between">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#637b99]">
              Billing
            </Text>
            <Text
              className="text-[26px] font-extrabold text-[#0d162a]"
              numberOfLines={1}
            >
              Monthly Billing
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Add bill"
            className="mt-1 h-10 min-w-[100px] flex-row items-center justify-center gap-[5px] rounded-[21px] bg-[#4C45F5] px-[13px] active:opacity-80"
            onPress={() => setShowBillTargetPicker(true)}
            style={{
              shadowColor: "#4C45F5",
              shadowOpacity: 0.25,
              shadowRadius: 7,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <MaterialCommunityIcons color="#fff" name="plus" size={18} />
            <Text className="text-[13px] font-bold text-white">Bill</Text>
          </Pressable>
        </View>
        <PeriodSwitcher
          onChange={(next) =>
            setPeriodChoice({ token: navToken, period: next })
          }
          period={period}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void refresh()}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <MonthlyBillingSummary totals={report.totals} />

        <Text className="mb-3 px-1 text-[11px] leading-4 text-[#7c8ba1]">
          Metered bills use the building rate (invoice ÷ total reading).
          Sub-meter unit charges are deducted from the building invoice. Tap a
          building to open its unit bills.
        </Text>

        {dialogs.monthlyOnlyBillIds.size > 0 ? (
          <Text className="mb-3 px-1 text-[11px] leading-4 text-[#7c8ba1]">
            Long press a one-off bill to edit or delete it.
          </Text>
        ) : null}

        {!hasProperties ? (
          <View className="items-center rounded-[24px] border border-[#e4eaf2] bg-white px-6 py-12">
            <View className="mb-3 h-16 w-16 items-center justify-center rounded-[20px] bg-[#EBECFF]">
              <MaterialCommunityIcons
                color="#4C45F5"
                name="office-building-outline"
                size={30}
              />
            </View>
            <Text className="text-[16px] font-extrabold text-[#1a2b44]">
              No properties to bill
            </Text>
            <Text className="mt-1 text-center text-[13px] text-[#7890ae]">
              Add a property, link its bills, then record this month&apos;s
              readings here.
            </Text>
            <Pressable
              accessibilityLabel="Open properties"
              className="mt-4 rounded-xl bg-[#4C45F5] px-5 py-3"
              onPress={() => router.push("/properties")}
            >
              <Text className="text-sm font-bold text-white">
                Open properties
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {report.buildings.map((billing) => (
              <AttentionHighlight
                key={billing.property.id}
                active={
                  highlightTarget?.kind === "building" &&
                  highlightTarget.id === billing.property.id
                }
                onComplete={clearHighlight}
                pulseKey={navToken ?? undefined}
                scrollRef={scrollRef}
              >
                <PropertyBillingCard
                  billing={billing}
                  oneOffBillIds={dialogs.monthlyOnlyBillIds}
                  onManageBuildingBill={(line) =>
                    dialogs.openOneOffActions(billing.property, line.bill)
                  }
                  onOpenUnits={openUnits}
                  onPressBuildingBill={(line) =>
                    dialogs.openBuildingBill(billing.property, line)
                  }
                  onShare={() => dialogs.openBuildingShare(billing)}
                />
              </AttentionHighlight>
            ))}

            {report.units.length > 0 ? (
              <View className="mb-2 mt-1">
                <Text className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
                  Units without a building
                </Text>
                {report.units.map((unit) => (
                  <AttentionHighlight
                    key={unit.property.id}
                    active={
                      highlightTarget?.kind === "unit" &&
                      highlightTarget.id === unit.property.id
                    }
                    onComplete={clearHighlight}
                    pulseKey={navToken ?? undefined}
                    radius={16}
                    scrollRef={scrollRef}
                  >
                    <UnitBillingCard
                      oneOffBillIds={dialogs.monthlyOnlyBillIds}
                      onManageBill={(property, line) =>
                        dialogs.openOneOffActions(property, line.bill)
                      }
                      onPressBill={(property, line) =>
                        dialogs.openUnitBill(property, line, undefined)
                      }
                      onShare={() => dialogs.openUnitShare(unit)}
                      unit={unit}
                    />
                  </AttentionHighlight>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <BillTargetPickerModal
        onClose={() => setShowBillTargetPicker(false)}
        onSelect={(property) => {
          setShowBillTargetPicker(false);
          router.push({
            pathname: "/bills-AddNewBill",
            params: {
              monthlyPeriod: period,
              monthlyPropertyId: property.id,
            },
          });
        }}
        period={period}
        properties={properties}
        visible={showBillTargetPicker}
      />

      <MonthlyBillDialogs dialogs={dialogs} />
    </SafeAreaView>
  );
}
