import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKeyboardAwareSheet } from "../../../hooks/useKeyboardAwareScroll";
import { getSheetBottomPadding } from "../../../hooks/useSheetInsets";
import { formatCurrency, getActiveCurrency } from "../../../utils/currency";
import { parseDecimal } from "../../../utils/number";
import { roundConsumption } from "../logic/monthlyBilling";
import type { BillingItem } from "../../bills/types";
import type { Property } from "../../properties/types";
import type { MonthlyBillEntry } from "../types";
import type { PaymentTabHandle, PaymentValues } from "./PaymentTab";
import { PaymentTab } from "./PaymentTab";
import { PhotoEvidenceField } from "./PhotoEvidenceField";

export type MonthlyBillEntryMode = "invoice" | "reading" | "amount";

export type MonthlyBillEntryTarget = {
  property: Property;
  bill: BillingItem;
  mode: MonthlyBillEntryMode;
  /** Computed lines (split, per person, fixed share) only accept payment data. */
  paymentOnly?: boolean;
  /** Fixed-share units only need photo evidence, not a monthly amount entry. */
  photoOnly?: boolean;
  entry?: MonthlyBillEntry;
  /** Captured photo that should already be attached when the form opens. */
  initialPhotoUri?: string;
  rate?: number;
  previousReadingSuggestion?: number;
  amountSuggestion?: number;
};

type EntryTab = "entry" | "payment";

/** The sheet's resting bottom spacing (`pb-6`). */
const SHEET_PADDING_BOTTOM = 24;

/** Tighter spacing used while the keyboard is open, so the actions sit close. */
const SHEET_KEYBOARD_PADDING = 10;

export function MonthlyBillEntryModal({
  target,
  onClose,
  onSave,
  onSavePayment,
  onClearPayment,
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
  /** Omitted when the caller only collects entry details (no payment tab). */
  onSavePayment?: (values: PaymentValues) => void;
  onClearPayment?: () => void;
  onRemove?: () => void;
}) {
  const [tab, setTab] = useState<EntryTab>(
    target.paymentOnly ? "payment" : "entry",
  );
  const insets = useSafeAreaInsets();
  const {
    scrollRef,
    viewportRef,
    onScroll,
    reveal,
    sheetStyle,
    onRootLayout,
    keyboardVisible,
  } = useKeyboardAwareSheet({
    // Android reports the keyboard height without the navigation bar.
    bottomInset: Platform.OS === "android" ? insets.bottom : 0,
  });
  // The navigation bar is behind the keyboard while it is open, so the action
  // row sits close to the keyboard instead of keeping room for it.
  const sheetBottomPadding = keyboardVisible
    ? SHEET_KEYBOARD_PADDING
    : getSheetBottomPadding(insets.bottom, SHEET_PADDING_BOTTOM);
  const paymentRef = useRef<PaymentTabHandle>(null);
  const previousReadingRef = useRef<TextInputInstance>(null);
  const readingRef = useRef<TextInputInstance>(null);
  const amountRef = useRef<TextInputInstance>(null);
  const [photoUri, setPhotoUri] = useState<string | undefined>(
    target.initialPhotoUri ?? target.entry?.photoUri,
  );
  const isMeterReading = target.bill.billingType === "Meter reading";
  const [reading, setReading] = useState(
    target.entry?.reading !== undefined ? String(target.entry.reading) : "",
  );
  const [previousReading, setPreviousReading] = useState(
    String(
      target.entry?.previousReading ?? target.previousReadingSuggestion ?? 0,
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
    if (target.photoOnly) {
      onSave({ photoUri });
      return;
    }

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

  const title = target.paymentOnly
    ? target.bill.name
    : target.photoOnly
      ? `${target.bill.name} photo`
    : target.mode === "invoice"
      ? `${target.bill.name} invoice`
      : target.mode === "reading"
        ? `${target.property.name} reading`
        : `${target.bill.name} amount`;

  /** Payment owns the tab when the caller only collects payment data. */
  const showPaymentForm =
    Boolean(onSavePayment) && (target.paymentOnly || tab === "payment");
  const isPaid = Boolean(target.entry?.paidAt);

  const subtitle = target.paymentOnly
    ? `${target.property.name} · Mark this bill as paid or update its payment details.`
    : target.photoOnly
      ? "The amount is fixed for this unit. Add or replace the bill photo."
    : target.mode === "invoice"
      ? isMeterReading
        ? "Enter the previous and current readings plus the amount to pay. Consumption and rate are computed automatically."
        : "Enter the total consumption and the amount to pay. The rate is computed automatically."
      : target.mode === "reading"
        ? target.rate !== undefined
          ? `Rate: ${formatCurrency(target.rate)} per ${target.bill.displayUnit || "unit"}`
          : "The building rate is unavailable until its invoice and reading are entered."
        : "Enter the amount for this bill.";

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      {/*
        No `KeyboardAvoidingView`: inside a modal it re-pads the layout on
        Android while the window resizes itself, which dropped focus and made
        the sheet jump. The sheet is lifted by the measured keyboard height
        instead, and capped so its top edge stays put.
      */}
      <View className="flex-1 justify-end bg-black/40" onLayout={onRootLayout}>
        <Pressable
          accessibilityLabel="Close"
          className="flex-1"
          onPress={onClose}
        />
        <View
          className="rounded-t-3xl bg-white px-5 pt-5"
          style={[sheetStyle, { paddingBottom: sheetBottomPadding }]}
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
              <MaterialCommunityIcons name="close" size={20} color="#475569" />
            </Pressable>
          </View>
          <Text className="mb-4 text-[12px] leading-4 text-slate-500">
            {subtitle}
          </Text>

          {target.paymentOnly && target.photoOnly && target.entry?.photoUri ? (
            <PhotoEvidenceField
              addLabel="Add bill photo"
              cameraPermissionMessage="Camera access is needed to replace this photo."
              editable={false}
              label="Bill photo"
              libraryPermissionMessage="Photo library access is needed to replace this photo."
              onChange={setPhotoUri}
              uri={target.entry.photoUri}
            />
          ) : null}

          {target.paymentOnly || !onSavePayment ? null : (
            <View className="mb-4 flex-row rounded-xl bg-slate-100 p-1">
              <TabButton
                active={tab === "entry"}
                label="Entry"
                onPress={() => setTab("entry")}
              />
              <TabButton
                active={tab === "payment"}
                label={target.entry?.paidAt ? "Payment · Paid" : "Payment"}
                onPress={() => setTab("payment")}
              />
            </View>
          )}

          <View ref={viewportRef} style={{ flexShrink: 1 }}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              onScroll={onScroll}
              ref={scrollRef}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
            >
              {/* Both tabs stay mounted so unsaved input survives switching. */}
              {onSavePayment ? (
                <View
                  style={{ display: showPaymentForm ? "flex" : "none" }}
                >
                  <PaymentTab
                    entry={target.entry}
                    onFieldFocus={reveal}
                    onSave={onSavePayment}
                    ref={paymentRef}
                  />
                </View>
              ) : null}

              <View style={{ display: showPaymentForm ? "none" : "flex" }}>
                {target.mode !== "amount" ? (
                  <>
                    {isMeterReading ? (
                      <View className="mb-3">
                        <Text className="mb-1.5 text-xs font-bold text-slate-700">
                          Previous reading ({target.bill.displayUnit || "units"}
                          )
                        </Text>
                        <TextInput
                          accessibilityLabel="Previous reading"
                          className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900"
                          keyboardType="decimal-pad"
                          onChangeText={setPreviousReading}
                          onFocus={() => reveal(previousReadingRef.current)}
                          placeholder="0"
                          placeholderTextColor="#94A3B8"
                          ref={previousReadingRef}
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
                        onFocus={() => reveal(readingRef.current)}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        ref={readingRef}
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

                {target.mode !== "reading" && !target.photoOnly ? (
                  <View className="mb-3">
                    <Text className="mb-1.5 text-xs font-bold text-slate-700">
                      Amount ({getActiveCurrency().symbol})
                    </Text>
                    <TextInput
                      accessibilityLabel="Amount"
                      className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900"
                      keyboardType="decimal-pad"
                      onChangeText={setAmount}
                      onFocus={() => reveal(amountRef.current)}
                      placeholder="0.00"
                      placeholderTextColor="#94A3B8"
                      ref={amountRef}
                      value={amount}
                    />
                  </View>
                ) : null}

                {target.mode === "invoice" && liveRate !== undefined ? (
                  <Text className="mb-1 text-[12px] font-semibold text-[#0f766e]">
                    Rate: {formatCurrency(liveRate)} per{" "}
                    {target.bill.displayUnit || "unit"}
                  </Text>
                ) : null}

                {target.mode === "reading" &&
                computedUnitAmount !== undefined ? (
                  <View className="mb-1 rounded-xl bg-[#eefbf8] px-3 py-2">
                    <Text className="text-[11px] font-semibold text-[#0f766e]">
                      Computed amount
                    </Text>
                    <Text className="text-lg font-extrabold text-[#0f4f38]">
                      {formatCurrency(computedUnitAmount)}
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
              </View>
            </ScrollView>
          </View>

          {/* Pinned so the actions never scroll out of reach behind the keyboard. */}
          <View className="mt-4 flex-row items-center gap-2">
            {showPaymentForm ? (
              <>
                {isPaid && onClearPayment ? (
                  <Pressable
                    accessibilityLabel="Mark as unpaid"
                    className="h-11 items-center justify-center rounded-xl border border-[#fecaca] px-3"
                    onPress={onClearPayment}
                  >
                    <Text className="text-sm font-bold text-[#DC2626]">
                      Unpaid
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel="Cancel"
                  className="h-11 flex-1 items-center justify-center rounded-xl border border-slate-200"
                  onPress={onClose}
                >
                  <Text className="text-sm font-bold text-slate-700">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Save payment"
                  className="h-11 flex-1 items-center justify-center rounded-xl bg-[#0F766E]"
                  onPress={() => paymentRef.current?.save()}
                >
                  <Text className="text-sm font-bold text-white">
                    {isPaid ? "Save" : "Mark paid"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
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
                  <Text className="text-sm font-bold text-slate-700">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Save entry"
                  className="h-11 flex-1 items-center justify-center rounded-xl bg-[#4C45F5]"
                  onPress={handleSave}
                >
                  <Text className="text-sm font-bold text-white">Save</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className={`h-9 flex-1 items-center justify-center rounded-lg ${
        active ? "bg-white" : ""
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-[12px] font-bold ${
          active ? "text-[#0d162a]" : "text-[#64748B]"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
