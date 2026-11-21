import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef } from "react";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    type LayoutChangeEvent,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "../../global.css";
import {
  DUE_DATE_TYPES,
  RECURRING_RULES,
  UTILITY_TYPES,
  BILLING_TYPES,
} from "../constants/bills";
import { BillSelectField } from "../features/bills/components/BillSelectField";
import { useBillForm } from "../features/bills/hooks/useBillForm";
import type {
  BillingType,
  DueDateType,
  RecurringRule,
  UtilityType,
} from "../features/bills/types";
import { FORM_SCROLL_OFFSET } from "../constants/ui";
import { formatDateMDY } from "../utils/date";
import { formatPeriodLabel } from "../utils/period";

type OpenMenu =
  | "utilityType"
  | "billingType"
  | "dueDateType"
  | "recurringRule"
  | null;

export default function BillsAddNewBillScreen() {
  const router = useRouter();
  const { id, monthlyPeriod, monthlyPropertyId } = useLocalSearchParams<{
    id?: string;
    monthlyPeriod?: string;
    monthlyPropertyId?: string;
  }>();
  const formScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const monthlyContext = useMemo(
    () =>
      monthlyPeriod && monthlyPropertyId
        ? { period: monthlyPeriod, propertyId: monthlyPropertyId }
        : undefined,
    [monthlyPeriod, monthlyPropertyId],
  );
  const { draft, update, save, isSaving } = useBillForm(id, monthlyContext);
  const {
    name,
    utilityType,
    billingType,
    displayUnit,
    defaultAmount,
    dueDateType,
    fixedDueDate,
    recurringRule,
    recurringDay,
  } = draft;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  // Auto-scroll support: remember each input's position and scroll the
  // focused one into view once the keyboard has shrunk the viewport.
  const fieldY = useRef<Record<string, number>>({});
  const focusedField = useRef<string | null>(null);

  const scrollToField = useCallback((key: string | null) => {
    if (!key) return;
    const y = fieldY.current[key];
    if (y === undefined) return;
    formScrollRef.current?.scrollTo({
      y: Math.max(0, y - FORM_SCROLL_OFFSET),
      animated: true,
    });
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () =>
      scrollToField(focusedField.current),
    );
    return () => sub.remove();
  }, [scrollToField]);

  const activeOptions =
    openMenu === "utilityType"
      ? UTILITY_TYPES
      : openMenu === "billingType"
      ? BILLING_TYPES
      : openMenu === "dueDateType"
        ? DUE_DATE_TYPES
        : RECURRING_RULES;
  const activeValue =
    openMenu === "utilityType"
      ? utilityType
      : openMenu === "billingType"
      ? billingType
      : openMenu === "dueDateType"
        ? dueDateType
        : recurringRule;

  const isOptionDisabled = (option: string) =>
    Boolean(monthlyContext) &&
    openMenu === "dueDateType" &&
    option === "Recurring monthly";

  const handleSave = async () => {
    const validation = await save();
    if (!validation.valid) {
      Alert.alert(validation.title, validation.message);
      return;
    }
    router.back();
  };

  const handleDateChange = (_event: unknown, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      update("fixedDueDate", formatDateMDY(date));
    }
    if (Platform.OS !== "ios") setShowDatePicker(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Bills",
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
      >
        <ScrollView
          ref={formScrollRef}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-5">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-emerald-700">
              Billing item
            </Text>
            <Text className="mt-1 text-2xl font-bold text-slate-900">
              {id ? "Edit billing item" : "Create New Billing Item"}
            </Text>
            {monthlyContext ? (
              <View className="mt-2 self-start rounded-full bg-emerald-50 px-3 py-1">
                <Text className="text-[11px] font-bold text-emerald-700">
                  One-off bill · {formatPeriodLabel(monthlyContext.period)}
                </Text>
              </View>
            ) : null}
            {monthlyContext ? (
              <Text className="mt-1.5 text-[11px] leading-4 text-slate-500">
                This bill will only appear in the selected month.
              </Text>
            ) : null}
          </View>

          <Text className="mb-1.5 text-xs font-semibold text-slate-700">
            Name
          </Text>
          <TextInput
            accessibilityLabel="Billing item name"
            className="mb-4 h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            placeholder="e.g. Internet, Rent, Laundry"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={(value) => update("name", value)}
            onLayout={(e: LayoutChangeEvent) => {
              fieldY.current.name = e.nativeEvent.layout.y;
            }}
            onFocus={() => {
              focusedField.current = "name";
              scrollToField("name");
            }}
          />

          <BillSelectField
            label="Utility type"
            value={utilityType}
            onPress={() => setOpenMenu("utilityType")}
          />

          <BillSelectField
            label="Billing type"
            value={billingType}
            onPress={() => setOpenMenu("billingType")}
          />

          <Text className="mb-1.5 text-xs font-semibold text-slate-700">
            Display unit
          </Text>
          <Text className="mb-1 text-[10px] uppercase text-slate-400">
            Optional
          </Text>
          <TextInput
            accessibilityLabel="Display unit"
            className="mb-4 h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            placeholder="e.g. units, hours, visits"
            placeholderTextColor="#94A3B8"
            value={displayUnit}
            onChangeText={(value) => update("displayUnit", value)}
            onLayout={(e: LayoutChangeEvent) => {
              fieldY.current.displayUnit = e.nativeEvent.layout.y;
            }}
            onFocus={() => {
              focusedField.current = "displayUnit";
              scrollToField("displayUnit");
            }}
          />

          <Text className="mb-1.5 text-xs font-semibold text-slate-700">
            Default amount (₱)
          </Text>
          <Text className="mb-1 text-[10px] uppercase text-slate-400">
            Optional
          </Text>
          <TextInput
            accessibilityLabel="Default amount"
            className="mb-4 h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
            placeholder="e.g. 1500.00"
            placeholderTextColor="#94A3B8"
            keyboardType="decimal-pad"
            value={defaultAmount}
            onChangeText={(value) => update("defaultAmount", value)}
            onLayout={(e: LayoutChangeEvent) => {
              fieldY.current.defaultAmount = e.nativeEvent.layout.y;
            }}
            onFocus={() => {
              focusedField.current = "defaultAmount";
              scrollToField("defaultAmount");
            }}
          />

          <BillSelectField
            label="Due date"
            value={dueDateType}
            onPress={() => setOpenMenu("dueDateType")}
          />

          {dueDateType === "Fixed date" ? (
            <>
              <Text className="mb-1.5 text-xs font-semibold text-slate-700">
                Fixed due date
              </Text>
              <Pressable
                accessibilityLabel="Select fixed due date"
                className="mb-6 h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3"
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  className={`text-sm ${fixedDueDate ? "text-slate-900" : "text-slate-400"}`}
                >
                  {fixedDueDate || "mm/dd/yyyy"}
                </Text>
                <MaterialCommunityIcons
                  name="calendar-month-outline"
                  size={21}
                  color="#475569"
                />
              </Pressable>
            </>
          ) : null}

          {dueDateType === "Recurring monthly" && !monthlyContext ? (
            <>
              <BillSelectField
                label="Recurring rule"
                value={recurringRule}
                onPress={() => setOpenMenu("recurringRule")}
              />
              {recurringRule === "Day of the month" ? (
                <>
                  <Text className="mb-1.5 text-xs font-semibold text-slate-700">
                    Day of the month
                  </Text>
                  <Text className="mb-1 text-[10px] uppercase text-slate-400">
                    Enter a number from 1 to 31
                  </Text>
                  <TextInput
                    accessibilityLabel="Recurring day of the month"
                    className="mb-6 h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                    placeholder="e.g. 15"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    value={recurringDay}
                    onChangeText={(value) => update("recurringDay", value)}
                    maxLength={2}
                    onLayout={(e: LayoutChangeEvent) => {
                      fieldY.current.recurringDay = e.nativeEvent.layout.y;
                    }}
                    onFocus={() => {
                      focusedField.current = "recurringDay";
                      scrollToField("recurringDay");
                    }}
                  />
                </>
              ) : null}
            </>
          ) : null}

          <Pressable
            accessibilityLabel="Save billing item"
            className={`h-12 items-center justify-center rounded-xl bg-blue-600 ${isSaving ? "opacity-60" : ""}`}
            disabled={isSaving}
            onPress={() => void handleSave()}
          >
            <Text className="text-sm font-bold text-white">
              {isSaving ? "Saving…" : "Save billing item"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && Platform.OS === "android" ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="calendar"
          onChange={handleDateChange}
        />
      ) : null}

      {showDatePicker && Platform.OS === "ios" ? (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View className="flex-1 justify-end bg-black/30">
            <View className="rounded-t-3xl bg-white px-4 pb-8 pt-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-slate-900">
                  Select due date
                </Text>
                <Pressable
                  accessibilityLabel="Done selecting due date"
                  className="rounded-full bg-blue-600 px-4 py-2"
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text className="font-semibold text-white">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      <Modal
        visible={openMenu !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenMenu(null)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/30"
          onPress={() => setOpenMenu(null)}
        >
          <Pressable
            className="rounded-t-3xl bg-white px-4 pb-8 pt-4"
            onPress={() => undefined}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900">
                {openMenu === "utilityType"
                  ? "Utility type"
                  : openMenu === "billingType"
                    ? "Billing type"
                  : openMenu === "dueDateType"
                    ? "Due date"
                    : "Recurring rule"}
              </Text>
              <Pressable
                accessibilityLabel="Close selection menu"
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                onPress={() => setOpenMenu(null)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color="#475569"
                />
              </Pressable>
            </View>
            {monthlyContext && openMenu === "dueDateType" ? (
              <Text className="mb-2 text-[11px] leading-4 text-slate-500">
                Recurring monthly is not available for one-off bills.
              </Text>
            ) : null}
            {activeOptions.map((option) => {
              const disabled = isOptionDisabled(option);
              return (
                <Pressable
                  key={option}
                  accessibilityState={{ disabled }}
                  className={`flex-row items-center border-b border-slate-100 py-4 ${disabled ? "opacity-40" : ""}`}
                  disabled={disabled}
                  onPress={() => {
                    if (openMenu === "utilityType")
                      update("utilityType", option as UtilityType);
                    else if (openMenu === "billingType")
                      update("billingType", option as BillingType);
                    else if (openMenu === "dueDateType")
                      update("dueDateType", option as DueDateType);
                    else update("recurringRule", option as RecurringRule);
                    setOpenMenu(null);
                  }}
                >
                  <Text className="flex-1 text-base text-slate-800">
                    {option}
                  </Text>
                  {disabled ? (
                    <Text className="text-[11px] font-semibold text-slate-400">
                      Not available
                    </Text>
                  ) : option === activeValue ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={22}
                      color="#2563EB"
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
