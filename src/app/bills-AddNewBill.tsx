import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
    BILLING_TYPES,
    DUE_DATE_TYPES,
    RECURRING_RULES,
    UTILITY_TYPES,
    getBillingItems,
    saveBillingItem,
    type BillingType,
    type DueDateType,
    type RecurringRule,
    type UtilityType,
} from "../lib/bills";

// How far above the focused input the form scrolls to. Larger = scrolls less,
// smaller = scrolls more (the input lands closer to the top of the screen).
const SCROLL_OFFSET = 120;

type OpenMenu =
  | "utilityType"
  | "billingType"
  | "dueDateType"
  | "recurringRule"
  | null;

const formatDate = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
};

type SelectFieldProps = {
  label: string;
  value: string;
  onPress: () => void;
};

function SelectField({ label, value, onPress }: SelectFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold text-slate-700">
        {label}
      </Text>
      <Pressable
        accessibilityLabel={`Select ${label}`}
        className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3"
        onPress={onPress}
      >
        <Text className="flex-1 text-sm text-slate-900">{value}</Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color="#475569" />
      </Pressable>
    </View>
  );
}

export default function BillsAddNewBillScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const formScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [name, setName] = useState("");
  const [utilityType, setUtilityType] = useState<UtilityType>(UTILITY_TYPES[0]);
  const [billingType, setBillingType] = useState<BillingType>(BILLING_TYPES[0]);
  const [displayUnit, setDisplayUnit] = useState("");
  const [defaultAmount, setDefaultAmount] = useState("");
  const [dueDateType, setDueDateType] = useState<DueDateType>(
    DUE_DATE_TYPES[0],
  );
  const [fixedDueDate, setFixedDueDate] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [recurringRule, setRecurringRule] = useState<RecurringRule>(
    RECURRING_RULES[0],
  );
  const [recurringDay, setRecurringDay] = useState("");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-scroll support: remember each input's position and scroll the
  // focused one into view once the keyboard has shrunk the viewport.
  const fieldY = useRef<Record<string, number>>({});
  const focusedField = useRef<string | null>(null);

  const scrollToField = useCallback((key: string | null) => {
    if (!key) return;
    const y = fieldY.current[key];
    if (y === undefined) return;
    formScrollRef.current?.scrollTo({
      y: Math.max(0, y - SCROLL_OFFSET),
      animated: true,
    });
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () =>
      scrollToField(focusedField.current),
    );
    return () => sub.remove();
  }, [scrollToField]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void (async () => {
        const item = (await getBillingItems()).find((current) => current.id === id);
        if (!item) return;
        setName(item.name);
        setUtilityType(item.utilityType ?? UTILITY_TYPES[4]);
        setBillingType(item.billingType);
        setDisplayUnit(item.displayUnit);
        setDefaultAmount(item.defaultAmount?.toString() ?? "");
        setDueDateType(item.dueDateType);
        setFixedDueDate(item.fixedDueDate ?? "");
        setRecurringRule(item.recurringRule ?? RECURRING_RULES[0]);
        setRecurringDay(item.recurringDay?.toString() ?? "");
      })();
    }, [id]),
  );

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

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Name required", "Enter a name for this billing item.");
      return;
    }

    const parsedAmount = defaultAmount.trim()
      ? Number.parseFloat(defaultAmount.replace(/,/g, ""))
      : undefined;
    if (parsedAmount !== undefined && Number.isNaN(parsedAmount)) {
      Alert.alert("Invalid amount", "Enter a valid default amount.");
      return;
    }
    if (dueDateType === "Fixed date" && !fixedDueDate.trim()) {
      Alert.alert(
        "Due date required",
        "Enter a fixed due date or choose another due-date option.",
      );
      return;
    }
    const parsedRecurringDay = recurringDay.trim()
      ? Number.parseInt(recurringDay, 10)
      : undefined;
    if (
      dueDateType === "Recurring monthly" &&
      recurringRule === "Day of the month" &&
      (parsedRecurringDay === undefined ||
        !Number.isInteger(parsedRecurringDay) ||
        parsedRecurringDay < 1 ||
        parsedRecurringDay > 31)
    ) {
      Alert.alert(
        "Invalid recurring day",
        "Enter a whole number from 1 to 31.",
      );
      return;
    }

    setIsSaving(true);
    await saveBillingItem({
      id: id ?? `${Date.now()}-${trimmedName.toLowerCase().replace(/\s+/g, "-")}`,
      name: trimmedName,
      utilityType,
      billingType,
      displayUnit: displayUnit.trim(),
      defaultAmount: parsedAmount,
      dueDateType,
      fixedDueDate:
        dueDateType === "Fixed date" ? fixedDueDate.trim() : undefined,
      recurringRule:
        dueDateType === "Recurring monthly" ? recurringRule : undefined,
      recurringDay:
        dueDateType === "Recurring monthly" && recurringRule === "Day of the month"
          ? parsedRecurringDay
          : undefined,
      createdAt: id
        ? (await getBillingItems()).find((item) => item.id === id)?.createdAt ?? new Date().toISOString()
        : new Date().toISOString(),
    });
    setIsSaving(false);
    router.back();
  };

  const handleDateChange = (_event: unknown, date?: Date) => {
    if (date) {
      setSelectedDate(date);
      setFixedDueDate(formatDate(date));
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
            onChangeText={setName}
            onLayout={(e: LayoutChangeEvent) => {
              fieldY.current.name = e.nativeEvent.layout.y;
            }}
            onFocus={() => {
              focusedField.current = "name";
              scrollToField("name");
            }}
          />

          <SelectField
            label="Utility type"
            value={utilityType}
            onPress={() => setOpenMenu("utilityType")}
          />

          <SelectField
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
            onChangeText={setDisplayUnit}
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
            onChangeText={setDefaultAmount}
            onLayout={(e: LayoutChangeEvent) => {
              fieldY.current.defaultAmount = e.nativeEvent.layout.y;
            }}
            onFocus={() => {
              focusedField.current = "defaultAmount";
              scrollToField("defaultAmount");
            }}
          />

          <SelectField
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

          {dueDateType === "Recurring monthly" ? (
            <>
              <SelectField
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
                    onChangeText={setRecurringDay}
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
            {activeOptions.map((option) => (
              <Pressable
                key={option}
                className="flex-row items-center border-b border-slate-100 py-4"
                onPress={() => {
                  if (openMenu === "utilityType")
                    setUtilityType(option as UtilityType);
                  else if (openMenu === "billingType")
                    setBillingType(option as BillingType);
                  else if (openMenu === "dueDateType")
                    setDueDateType(option as DueDateType);
                  else setRecurringRule(option as RecurringRule);
                  setOpenMenu(null);
                }}
              >
                <Text className="flex-1 text-base text-slate-800">
                  {option}
                </Text>
                {option === activeValue ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={22}
                    color="#2563EB"
                  />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
