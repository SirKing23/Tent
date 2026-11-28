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
import {
  validateBillingDetailsStep,
  validateBillingDueDateStep,
  validateBillingReminderStep,
} from "../features/bills/logic/billingRules";
import { useBillForm } from "../features/bills/hooks/useBillForm";
import {
  BILL_REMINDER_OPTIONS,
  DEFAULT_REMINDER_TIME,
  formatReminderTime,
} from "../features/bills/logic/billReminders";
import type {
  BillReminderOffset,
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
    reminderEnabled,
    reminderTimes,
  } = draft;
  // Same wizard pattern as the New Property form: one step per section.
  const steps = useMemo(
    () =>
      monthlyContext
        ? ["Details", "Due date"]
        : ["Details", "Due date", "Reminder"],
    [monthlyContext],
  );
  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [timePickerOffset, setTimePickerOffset] =
    useState<BillReminderOffset | null>(null);
  const [timePickerDate, setTimePickerDate] = useState(
    () => new Date(2000, 0, 1, 9, 0),
  );

  // Reminders hang off the due date, so a bill without one cannot have any.
  const canRemind = dueDateType !== "No Due date" && !monthlyContext;
  const showReminderOptions = canRemind && reminderEnabled;

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

  const validateStep = (index: number) =>
    index === 0
      ? validateBillingDetailsStep(draft)
      : index === 1
        ? validateBillingDueDateStep(draft)
        : validateBillingReminderStep(draft);

  const goNext = () => {
    const validation = validateStep(step);
    if (!validation.valid) {
      Alert.alert(validation.title, validation.message);
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
    formScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0));
    formScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

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

  const toggleReminder = () => {
    if (!canRemind) return;
    if (reminderEnabled) {
      update("reminderEnabled", false);
      return;
    }
    // Start with the two usual lead times instead of an empty section.
    update("reminderEnabled", true);
    if (Object.keys(reminderTimes).length === 0) {
      update("reminderTimes", {
        2: DEFAULT_REMINDER_TIME,
        1: DEFAULT_REMINDER_TIME,
      });
    }
  };

  const toggleReminderOffset = (offset: BillReminderOffset) => {
    const next = { ...reminderTimes };
    if (next[offset]) delete next[offset];
    else next[offset] = DEFAULT_REMINDER_TIME;
    update("reminderTimes", next);
  };

  const openTimePicker = (offset: BillReminderOffset) => {
    const [hours, minutes] = (reminderTimes[offset] ?? DEFAULT_REMINDER_TIME)
      .split(":")
      .map(Number);
    setTimePickerDate(new Date(2000, 0, 1, hours || 0, minutes || 0));
    setTimePickerOffset(offset);
  };

  const handleTimeChange = (_event: unknown, date?: Date) => {
    if (date && timePickerOffset !== null) {
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      update("reminderTimes", {
        ...reminderTimes,
        [timePickerOffset]: `${hours}:${minutes}`,
      });
      setTimePickerDate(date);
    }
    if (Platform.OS !== "ios") setTimePickerOffset(null);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={formScreenStyles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Bills",
        }}
      />
      {/* ── Progress indicator ───────────────────────────────────────── */}
      <View style={styles.progress}>
        {steps.map((label, index) => (
          <View key={label} style={styles.progressItem}>
            <View
              style={[
                styles.progressDot,
                index === step && styles.progressDotActive,
                index < step && styles.progressDotDone,
              ]}
            >
              {index < step ? (
                <MaterialCommunityIcons color="#fff" name="check" size={14} />
              ) : (
                <Text
                  style={[
                    styles.progressDotText,
                    index === step && styles.progressDotTextActive,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.progressLabel,
                index === step && styles.progressLabelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <KeyboardAvoidingView behavior="padding" style={formScreenStyles.flex}>
        <ScrollView
          ref={formScrollRef}
          contentContainerStyle={formScreenStyles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={formScreenStyles.flex}
        >
          {step === 0 && (
            <View>
              <SectionHeader
                eyebrow={`Step 1 of ${steps.length}`}
                title="Details"
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
            </View>
          )}

          {step === 1 && (
            <View>
              <SectionHeader
                eyebrow={`Step 2 of ${steps.length}`}
                title="Due date"
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
            </View>
          )}

          {step === 2 && (
            <View>
              <SectionHeader
                eyebrow={`Step 3 of ${steps.length}`}
                title="Reminder"
              />

              <Pressable
                accessibilityLabel="Remind me before the due date"
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: reminderEnabled && canRemind,
                  disabled: !canRemind,
                }}
                disabled={!canRemind}
                onPress={toggleReminder}
                style={[
                  styles.reminderToggle,
                  !canRemind && styles.reminderToggleDisabled,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    reminderEnabled && canRemind && styles.checkboxChecked,
                  ]}
                >
                  {reminderEnabled && canRemind ? (
                    <MaterialCommunityIcons
                      color="#fff"
                      name="check"
                      size={14}
                    />
                  ) : null}
                </View>
                <View style={styles.reminderToggleText}>
                  <Text style={styles.reminderTitle}>
                    Notify me before the due date
                  </Text>
                  <Text style={styles.reminderHint}>
                    {canRemind
                      ? "Alerts also show on the Reminders page and its calendar."
                      : "Set a due date first to add a reminder."}
                  </Text>
                </View>
              </Pressable>

              {showReminderOptions
                ? BILL_REMINDER_OPTIONS.map((option) => {
                    const time = reminderTimes[option.offset];
                    const checked = typeof time === "string";
                    return (
                      <View key={option.offset} style={styles.reminderRow}>
                        <Pressable
                          accessibilityLabel={option.label}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          onPress={() => toggleReminderOffset(option.offset)}
                          style={styles.reminderOption}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              checked && styles.checkboxChecked,
                            ]}
                          >
                            {checked ? (
                              <MaterialCommunityIcons
                                color="#fff"
                                name="check"
                                size={14}
                              />
                            ) : null}
                          </View>
                          <Text style={styles.reminderOptionLabel}>
                            {option.label}
                          </Text>
                        </Pressable>

                        {checked ? (
                          <Pressable
                            accessibilityLabel={`Set the time for ${option.label.toLowerCase()}`}
                            accessibilityRole="button"
                            onPress={() => openTimePicker(option.offset)}
                            style={styles.timeButton}
                          >
                            <MaterialCommunityIcons
                              color="#4f46e5"
                              name="clock-outline"
                              size={15}
                            />
                            <Text style={styles.timeButtonText}>
                              {formatReminderTime(time)}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })
                : null}
            </View>
          )}

          <View style={formScreenStyles.bottomSpacer} />
        </ScrollView>

        <FormFooter
          cancelDisabled={step === 0}
          cancelLabel="Back"
          isSubmitting={isSaving}
          onCancel={goBack}
          onSubmit={step < steps.length - 1 ? goNext : () => void handleSave()}
          submitIcon={step < steps.length - 1 ? "arrow-forward" : "checkmark"}
          submitLabel={
            step < steps.length - 1
              ? "Next"
              : id
                ? "Save Changes"
                : "Create Billing Item"
          }
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

      {timePickerOffset !== null && Platform.OS === "android" ? (
        <DateTimePicker
          value={timePickerDate}
          mode="time"
          onChange={handleTimeChange}
        />
      ) : null}

      {timePickerOffset !== null && Platform.OS === "ios" ? (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => setTimePickerOffset(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select reminder time</Text>
                <Pressable
                  accessibilityLabel="Done selecting reminder time"
                  accessibilityRole="button"
                  className="rounded-full bg-blue-600 px-4 py-2"
                  onPress={() => setTimePickerOffset(null)}
                >
                  <Text className="font-semibold text-white">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={timePickerDate}
                mode="time"
                display="default"
                onChange={handleTimeChange}
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

  // Progress bar (same layout as the New Property form)
  progress: {
    backgroundColor: "#fff",
    borderBottomColor: "#e4eaf2",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressItem: { alignItems: "center", flex: 1, gap: 4 },
  progressDot: {
    alignItems: "center",
    backgroundColor: "#e4eaf2",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  progressDotActive: { backgroundColor: "#5041df" },
  progressDotDone: { backgroundColor: "#0f766e" },
  progressDotText: { color: "#8b9bb0", fontSize: 12, fontWeight: "700" },
  progressDotTextActive: { color: "#fff" },
  progressLabel: {
    color: "#8b9bb0",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
  },
  progressLabelActive: { color: "#5041df", fontWeight: "800" },

  reminderToggle: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reminderToggleDisabled: { backgroundColor: "#f8fafc", opacity: 0.75 },
  reminderToggleText: { flex: 1, marginLeft: 10 },
  reminderTitle: { color: "#0d162a", fontSize: 13, fontWeight: "700" },
  reminderHint: { color: "#64748b", fontSize: 11, marginTop: 2, lineHeight: 15 },

  checkbox: {
    alignItems: "center",
    borderColor: "#cbd5e1",
    borderRadius: 6,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  checkboxChecked: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },

  reminderRow: {
    alignItems: "center",
    borderBottomColor: "#eef2f7",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  reminderOption: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    paddingRight: 10,
  },
  reminderOptionLabel: {
    color: "#0d162a",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 10,
  },
  timeButton: {
    alignItems: "center",
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  timeButtonText: {
    color: "#4f46e5",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },

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
