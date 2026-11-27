import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentRef } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  FieldInput,
  FormFooter,
  SectionHeader,
  SelectField,
  formScreenStyles,
} from "../../components/FormKit";
import {
  BILLING_TYPES,
  DUE_DATE_TYPES,
  RECURRING_RULES,
  UTILITY_TYPES,
} from "../constants/bills";
import { FORM_SCROLL_OFFSET } from "../constants/ui";
import { BillSelectField } from "../features/bills/components/BillSelectField";
import { useBillForm } from "../features/bills/hooks/useBillForm";
import type {
  BillingType,
  DueDateType,
  RecurringRule,
  UtilityType,
} from "../features/bills/types";
import { getActiveCurrency } from "../utils/currency";
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
    <SafeAreaView edges={["bottom"]} style={formScreenStyles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Bills",
        }}
      />
      <KeyboardAvoidingView behavior="padding" style={formScreenStyles.flex}>
        <ScrollView
          ref={formScrollRef}
          contentContainerStyle={formScreenStyles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={formScreenStyles.flex}
        >
          <SectionHeader
            eyebrow="Billing item"
            title={id ? "Edit Billing Item" : "Create Billing Item"}
            subtitle={
              monthlyContext
                ? "This bill will only appear in the selected month."
                : undefined
            }
          >
            {monthlyContext ? (
              <View style={styles.periodBadge}>
                <Text style={styles.periodBadgeText}>
                  One-off bill · {formatPeriodLabel(monthlyContext.period)}
                </Text>
              </View>
            ) : null}
          </SectionHeader>

          <FieldInput
            label="Name"
            onChangeText={(value) => update("name", value)}
            onFocus={() => {
              focusedField.current = "name";
              scrollToField("name");
            }}
            onLayout={(e) => {
              fieldY.current.name = e.nativeEvent.layout.y;
            }}
            placeholder="e.g. Internet, Rent, Laundry"
            value={name}
          />

          <BillSelectField
            label="Utility type"
            onPress={() => setOpenMenu("utilityType")}
            value={utilityType}
          />

          <BillSelectField
            label="Billing type"
            onPress={() => setOpenMenu("billingType")}
            value={billingType}
          />

          <FieldInput
            label="Display unit"
            onChangeText={(value) => update("displayUnit", value)}
            onFocus={() => {
              focusedField.current = "displayUnit";
              scrollToField("displayUnit");
            }}
            onLayout={(e) => {
              fieldY.current.displayUnit = e.nativeEvent.layout.y;
            }}
            optional
            placeholder="e.g. units, hours, visits"
            value={displayUnit}
          />

          <FieldInput
            keyboardType="decimal-pad"
            label={`Default amount (${getActiveCurrency().symbol})`}
            onChangeText={(value) => update("defaultAmount", value)}
            onFocus={() => {
              focusedField.current = "defaultAmount";
              scrollToField("defaultAmount");
            }}
            onLayout={(e) => {
              fieldY.current.defaultAmount = e.nativeEvent.layout.y;
            }}
            optional
            placeholder="e.g. 1500.00"
            value={defaultAmount}
          />

          <BillSelectField
            label="Due date"
            onPress={() => setOpenMenu("dueDateType")}
            value={dueDateType}
          />

          {dueDateType === "Fixed date" ? (
            <SelectField
              icon="calendar-outline"
              label="Fixed due date"
              onPress={() => setShowDatePicker(true)}
              placeholder="mm/dd/yyyy"
              value={fixedDueDate}
            />
          ) : null}

          {dueDateType === "Recurring monthly" && !monthlyContext ? (
            <>
              <BillSelectField
                label="Recurring rule"
                onPress={() => setOpenMenu("recurringRule")}
                value={recurringRule}
              />
              {recurringRule === "Day of the month" ? (
                <FieldInput
                  hint="Enter a number from 1 to 31"
                  keyboardType="number-pad"
                  label="Day of the month"
                  maxLength={2}
                  onChangeText={(value) => update("recurringDay", value)}
                  onFocus={() => {
                    focusedField.current = "recurringDay";
                    scrollToField("recurringDay");
                  }}
                  onLayout={(e) => {
                    fieldY.current.recurringDay = e.nativeEvent.layout.y;
                  }}
                  placeholder="e.g. 15"
                  value={recurringDay}
                />
              ) : null}
            </>
          ) : null}

          <View style={formScreenStyles.bottomSpacer} />
        </ScrollView>

        <FormFooter
          onCancel={() => router.back()}
          onSubmit={() => void handleSave()}
          submitLabel={id ? "Save Changes" : "Create Billing Item"}
          isSubmitting={isSaving}
        />
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
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select due date</Text>
                <Pressable
                  accessibilityLabel="Done selecting due date"
                  accessibilityRole="button"
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
            className="rounded-t-3xl bg-white px-4 pt-4 pb-8"
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
                <MaterialCommunityIcons name="close" size={20} color="#475569" />
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
                  className={`flex-row items-center border-b border-slate-100 py-4 ${
                    disabled ? "opacity-40" : ""
                  }`}
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
                      color="#5041df"
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

const styles = StyleSheet.create({
  periodBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  periodBadgeText: { color: "#4f46e5", fontSize: 11, fontWeight: "700" },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(4,10,24,0.32)" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: { color: "#0d162a", fontSize: 18, fontWeight: "800" },
});
