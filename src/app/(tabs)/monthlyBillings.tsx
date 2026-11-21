import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "../../../global.css";
import type { PaymentMode } from "../../constants/payments";
import { isSubMeterEligible } from "../../features/bills/logic/billingRules";
import type { BillingItem } from "../../features/bills/types";
import { BillTargetPickerModal } from "../../features/monthlyBilling/components/BillTargetPickerModal";
import { MonthlyBillEntryModal } from "../../features/monthlyBilling/components/MonthlyBillEntryModal";
import type { MonthlyBillEntryTarget } from "../../features/monthlyBilling/components/MonthlyBillEntryModal";
import { MonthlyBillingSummary } from "../../features/monthlyBilling/components/MonthlyBillingSummary";
import { suggestPreviousReading } from "../../features/monthlyBilling/logic/monthlyBilling";
import { PaymentModal } from "../../features/monthlyBilling/components/PaymentModal";
import type { PaymentTarget } from "../../features/monthlyBilling/components/PaymentModal";
import { PeriodSwitcher } from "../../features/monthlyBilling/components/PeriodSwitcher";
import {
  PropertyBillingCard,
  UnitBillingCard,
} from "../../features/monthlyBilling/components/PropertyBillingCard";
import { useMonthlyBilling } from "../../features/monthlyBilling/hooks/useMonthlyBilling";
import type { UnitBillLine } from "../../features/monthlyBilling/types";
import type { Property } from "../../features/properties/types";
import { getCurrentPeriod } from "../../utils/period";

export default function MonthlyBillingsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState(getCurrentPeriod());
  const {
    report,
    properties,
    entryFor,
    previousEntryFor,
    isLoading,
    refresh,
    saveEntry,
    savePayment,
    clearPayment,
    removeEntry,
  } = useMonthlyBilling(period);
  const [target, setTarget] = useState<MonthlyBillEntryTarget | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(
    null,
  );
  const [showBillTargetPicker, setShowBillTargetPicker] = useState(false);

  const openBuildingBill = (
    billing: (typeof report.buildings)[number],
    line: (typeof report.buildings)[number]["lines"][number],
  ) => {
    setTarget({
      property: billing.property,
      bill: line.bill,
      mode: isSubMeterEligible(line.bill.billingType) ? "invoice" : "amount",
      entry: line.entry,
      rate: line.rate,
      amountSuggestion: line.invoiceAmount,
      previousReadingSuggestion: suggestPreviousReading(
        previousEntryFor(billing.property.id, line.bill.id),
      ),
    });
  };

  const openUnitBill = (
    unit: Property,
    line: UnitBillLine,
    rate: number | undefined,
  ) => {
    // Split and per-person lines are computed allocations, not editable input.
    if (line.source !== "sub-meter" && line.source !== "independent") return;
    setTarget({
      property: unit,
      bill: line.bill,
      mode: line.source === "independent" ? "amount" : "reading",
      entry: entryFor(unit.id, line.bill.id),
      rate,
      previousReadingSuggestion: suggestPreviousReading(
        previousEntryFor(unit.id, line.bill.id),
      ),
    });
  };

  const handleSave = async (values: {
    reading?: number;
    previousReading?: number;
    amount?: number;
    photoUri?: string;
  }) => {
    if (!target) return;
    try {
      await saveEntry({
        propertyId: target.property.id,
        billingItemId: target.bill.id,
        reading: values.reading,
        previousReading: values.previousReading,
        amount: values.amount,
        photoUri: values.photoUri,
      });
      setTarget(null);
    } catch (error) {
      console.error("Unable to save monthly bill entry:", error);
      Alert.alert(
        "Save failed",
        "The monthly amount could not be saved. Please try again.",
      );
    }
  };

  const clearEntry = async () => {
    if (!target) return;
    try {
      await removeEntry(target.property.id, target.bill.id);
      setTarget(null);
    } catch (error) {
      console.error("Unable to remove monthly bill entry:", error);
      Alert.alert("Remove failed", "Please try again.");
    }
  };

  const openPayment = (property: Property, bill: BillingItem) => {
    setPaymentTarget({
      property,
      bill,
      entry: entryFor(property.id, bill.id),
    });
  };

  const handleSavePayment = async (values: {
    paidAt: string;
    paymentMode: PaymentMode;
    paymentDescription?: string;
    paymentProofUri?: string;
  }) => {
    if (!paymentTarget) return;
    try {
      await savePayment({
        propertyId: paymentTarget.property.id,
        billingItemId: paymentTarget.bill.id,
        ...values,
      });
      setPaymentTarget(null);
    } catch (error) {
      console.error("Unable to save payment:", error);
      Alert.alert(
        "Save failed",
        "The payment details could not be saved. Please try again.",
      );
    }
  };

  const handleClearPayment = async () => {
    if (!paymentTarget) return;
    try {
      await clearPayment(
        paymentTarget.property.id,
        paymentTarget.bill.id,
      );
      setPaymentTarget(null);
    } catch (error) {
      console.error("Unable to clear payment:", error);
      Alert.alert("Update failed", "Please try again.");
    }
  };

  const handleRemove = () => {
    if (!target) return;
    Alert.alert(
      "Remove entry?",
      "This clears the recorded reading and amount for this bill in the selected month.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void clearEntry(),
        },
      ],
    );
  };

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
        <PeriodSwitcher onChange={setPeriod} period={period} />
      </View>

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
        <MonthlyBillingSummary totals={report.totals} />

        <Text className="mb-3 px-1 text-[11px] leading-4 text-[#7c8ba1]">
          Metered bills use the building rate (invoice ÷ total reading).
          Sub-meter unit charges are deducted from the building invoice. Split
          and per-person bills are allocated across units.
        </Text>

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
              <PropertyBillingCard
                key={billing.property.id}
                billing={billing}
                onPressBuildingBill={(line) =>
                  openBuildingBill(billing, line)
                }
                onPressUnitBill={(unit, line) =>
                  openUnitBill(
                    unit,
                    line,
                    billing.lines.find(
                      (buildingLine) => buildingLine.bill.id === line.bill.id,
                    )?.rate,
                  )
                }
                onPressPayment={openPayment}
              />
            ))}

            {report.units.length > 0 ? (
              <View className="mb-2 mt-1">
                <Text className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
                  Units without a building
                </Text>
                {report.units.map((unit) => (
                  <UnitBillingCard
                    key={unit.property.id}
                    onPressBill={(property, line) =>
                      openUnitBill(property, line, undefined)
                    }
                    onPressPayment={openPayment}
                    unit={unit}
                  />
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

      {paymentTarget ? (
        <PaymentModal
          key={`${paymentTarget.property.id}:${paymentTarget.bill.id}`}
          onClear={
            paymentTarget.entry?.paidAt
              ? () => void handleClearPayment()
              : undefined
          }
          onClose={() => setPaymentTarget(null)}
          onSave={(values) => void handleSavePayment(values)}
          target={paymentTarget}
        />
      ) : null}

      {target ? (
        <MonthlyBillEntryModal
          key={`${target.property.id}:${target.bill.id}:${target.mode}`}
          onClose={() => setTarget(null)}
          onRemove={target.entry ? handleRemove : undefined}
          onSave={(values) => void handleSave(values)}
          target={target}
        />
      ) : null}
    </SafeAreaView>
  );
}
