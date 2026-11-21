import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { formatPeso } from "../../../utils/currency";
import { parseDecimal } from "../../../utils/number";
import { roundConsumption } from "../logic/monthlyBilling";
import type { BillingItem } from "../../bills/types";
import type { Property } from "../../properties/types";
import type { MonthlyBillEntry } from "../types";
import { PhotoEvidenceField } from "./PhotoEvidenceField";

export type MonthlyBillEntryMode = "invoice" | "reading" | "amount";

export type MonthlyBillEntryTarget = {
  property: Property;
  bill: BillingItem;
  mode: MonthlyBillEntryMode;
  entry?: MonthlyBillEntry;
  rate?: number;
  previousReadingSuggestion?: number;
  amountSuggestion?: number;
};

export function MonthlyBillEntryModal({
  target,
  onClose,
  onSave,
  onRemove,
}: {
  target: MonthlyBillEntryTarget;
  onClose: () => void;
  onSave: (values: {
    reading?: number;
    previousReading?: number;
    amount?: number;
    photoUri?: string;
  }) => void;
  onRemove?: () => void;
}) {
  const [photoUri, setPhotoUri] = useState<string | undefined>(
    target.entry?.photoUri,
  );
  const isMeterReading = target.bill.billingType === "Meter reading";
  const [reading, setReading] = useState(
    target.entry?.reading !== undefined ? String(target.entry.reading) : "",
  );
  const [previousReading, setPreviousReading] = useState(
    String(
      target.entry?.previousReading ??
        target.previousReadingSuggestion ??
        0,
    ),
  );
  const [amount, setAmount] = useState(
    target.entry?.amount !== undefined
      ? String(target.entry.amount)
      : target.amountSuggestion !== undefined
        ? String(target.amountSuggestion)
        : "",
  );

  const readingValue = parseDecimal(reading);
  const previousValue = parseDecimal(previousReading) ?? 0;
  const amountValue = parseDecimal(amount);
  const consumption =
    readingValue === null
      ? undefined
      : isMeterReading
        ? readingValue >= previousValue
          ? roundConsumption(readingValue - previousValue)
          : undefined
        : readingValue;
  const liveRate =
    target.mode === "invoice" &&
    consumption !== undefined &&
    consumption > 0 &&
    amountValue !== null
      ? amountValue / consumption
      : undefined;
  const computedUnitAmount =
    target.mode === "reading" &&
    target.rate !== undefined &&
    consumption !== undefined
      ? consumption * target.rate
      : undefined;

  const validateReading = (): boolean => {
    if (readingValue === null || readingValue < 0) {
      Alert.alert("Reading required", "Enter a valid meter reading.");
      return false;
    }
    if (isMeterReading && previousValue < 0) {
      Alert.alert(
        "Invalid previous reading",
        "The previous reading cannot be negative.",
      );
      return false;
    }
    if (isMeterReading && readingValue < previousValue) {
      Alert.alert(
        "Invalid current reading",
        "The current reading must be at least the previous reading.",
      );
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (target.mode === "reading") {
      if (!validateReading()) return;
      onSave({
        reading: readingValue ?? undefined,
        previousReading: isMeterReading ? previousValue : undefined,
        photoUri,
      });
      return;
    }

    if (amountValue === null || amountValue < 0) {
      Alert.alert(
        "Amount required",
        target.mode === "invoice"
          ? "Enter the amount on the utility invoice."
          : "Enter the amount for this bill.",
      );
      return;
    }

    if (
      target.mode === "invoice" &&
      readingValue !== null &&
      !validateReading()
    ) {
      return;
    }

    onSave({
      reading:
        target.mode === "invoice" && readingValue !== null
          ? readingValue
          : undefined,
      previousReading:
        target.mode === "invoice" && isMeterReading && readingValue !== null
          ? previousValue
          : undefined,
      amount: amountValue,
      photoUri,
    });
  };

  const title =
    target.mode === "invoice"
      ? `${target.bill.name} invoice`
      : target.mode === "reading"
        ? `${target.property.name} reading`
        : `${target.bill.name} amount`;

  const subtitle =
    target.mode === "invoice"
      ? isMeterReading
        ? "Enter the previous and current readings plus the amount to pay. Consumption and rate are computed automatically."
        : "Enter the total consumption and the amount to pay. The rate is computed automatically."
      : target.mode === "reading"
        ? target.rate !== undefined
          ? `Rate: ${formatPeso(target.rate)} per ${target.bill.displayUnit || "unit"}`
          : "The building rate is unavailable until its invoice and reading are entered."
        : "Enter the amount for this bill.";

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          accessibilityLabel="Close"
          className="flex-1"
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="max-h-[88%] rounded-t-3xl bg-white px-5 pb-8 pt-5">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="flex-1 pr-3 text-lg font-extrabold text-slate-900">
                {title}
              </Text>
              <Pressable
                accessibilityLabel="Close"
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                onPress={onClose}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color="#475569"
                />
              </Pressable>
            </View>
            <Text className="mb-4 text-[12px] leading-4 text-slate-500">
              {subtitle}
            </Text>

            {target.mode !== "amount" ? (
              <>
                {isMeterReading ? (
                  <View className="mb-3">
                    <Text className="mb-1.5 text-xs font-bold text-slate-700">
                      Previous reading (
                      {target.bill.displayUnit || "units"})
                    </Text>
                    <TextInput
                      accessibilityLabel="Previous reading"
                      className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900"
                      keyboardType="decimal-pad"
                      onChangeText={setPreviousReading}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      value={previousReading}
                    />
                    <Text className="mt-1 text-[10px] text-slate-500">
                      Auto-filled from last month; defaults to 0.
                    </Text>
                  </View>
                ) : null}

                <View className="mb-3">
                  <Text className="mb-1.5 text-xs font-bold text-slate-700">
                    {isMeterReading
                      ? `Current reading (${target.bill.displayUnit || "units"})`
                      : target.mode === "invoice"
                        ? "Total reading / consumption"
                        : `Sub-meter reading (${target.bill.displayUnit || "units"})`}
                  </Text>
                  <TextInput
                    accessibilityLabel={
                      isMeterReading ? "Current reading" : "Reading"
                    }
                    className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900"
                    keyboardType="decimal-pad"
                    onChangeText={setReading}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    value={reading}
                  />
                </View>

                {isMeterReading && consumption !== undefined ? (
                  <View className="mb-2 rounded-xl bg-[#f1f5f9] px-3 py-2">
                    <Text className="text-[11px] font-semibold text-[#475569]">
                      Consumption
                    </Text>
                    <Text className="text-base font-extrabold text-[#0d162a]">
                      {consumption} {target.bill.displayUnit || "units"}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {target.mode !== "reading" ? (
              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-bold text-slate-700">
                  Amount (₱)
                </Text>
                <TextInput
                  accessibilityLabel="Amount"
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900"
                  keyboardType="decimal-pad"
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  value={amount}
                />
              </View>
            ) : null}

            {target.mode === "invoice" && liveRate !== undefined ? (
              <Text className="mb-1 text-[12px] font-semibold text-[#0f766e]">
                Rate: {formatPeso(liveRate)} per{" "}
                {target.bill.displayUnit || "unit"}
              </Text>
            ) : null}

            {target.mode === "reading" && computedUnitAmount !== undefined ? (
              <View className="mb-1 rounded-xl bg-[#eefbf8] px-3 py-2">
                <Text className="text-[11px] font-semibold text-[#0f766e]">
                  Computed amount
                </Text>
                <Text className="text-lg font-extrabold text-[#0f4f38]">
                  {formatPeso(computedUnitAmount)}
                </Text>
              </View>
            ) : null}

            <PhotoEvidenceField
              addLabel="Add meter photo"
              cameraPermissionMessage="Camera access is needed to take the meter photo."
              label="Meter photo (optional)"
              libraryPermissionMessage="Photo library access is needed to choose the meter photo."
              onChange={setPhotoUri}
              uri={photoUri}
            />

            <View className="mt-4 flex-row items-center gap-2">
              {onRemove ? (
                <Pressable
                  accessibilityLabel="Remove entry"
                  className="h-11 items-center justify-center rounded-xl border border-[#fecaca] px-4"
                  onPress={onRemove}
                >
                  <Text className="text-sm font-bold text-[#DC2626]">
                    Remove
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityLabel="Cancel"
                className="h-11 flex-1 items-center justify-center rounded-xl border border-slate-200"
                onPress={onClose}
              >
                <Text className="text-sm font-bold text-slate-700">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Save entry"
                className="h-11 flex-1 items-center justify-center rounded-xl bg-[#4C45F5]"
                onPress={handleSave}
              >
                <Text className="text-sm font-bold text-white">Save</Text>
              </Pressable>
            </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
