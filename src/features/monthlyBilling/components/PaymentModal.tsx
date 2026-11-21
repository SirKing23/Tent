import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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

import {
  PAYMENT_MODES,
  type PaymentMode,
} from "../../../constants/payments";
import { formatDateMDY } from "../../../utils/date";
import type { BillingItem } from "../../bills/types";
import type { Property } from "../../properties/types";
import type { MonthlyBillEntry } from "../types";
import { PhotoEvidenceField } from "./PhotoEvidenceField";

export type PaymentTarget = {
  property: Property;
  bill: BillingItem;
  entry?: MonthlyBillEntry;
};

export function PaymentModal({
  target,
  onClose,
  onSave,
  onClear,
}: {
  target: PaymentTarget;
  onClose: () => void;
  onSave: (values: {
    paidAt: string;
    paymentMode: PaymentMode;
    paymentDescription?: string;
    paymentProofUri?: string;
  }) => void;
  onClear?: () => void;
}) {
  const [date, setDate] = useState(
    target.entry?.paidAt ? new Date(target.entry.paidAt) : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mode, setMode] = useState<PaymentMode>(
    target.entry?.paymentMode ?? PAYMENT_MODES[0],
  );
  const [showModes, setShowModes] = useState(false);
  const [description, setDescription] = useState(
    target.entry?.paymentDescription ?? "",
  );
  const [proofUri, setProofUri] = useState<string | undefined>(
    target.entry?.paymentProofUri,
  );

  const isPaid = Boolean(target.entry?.paidAt);

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "set" && selectedDate) setDate(selectedDate);
  };

  const handleSave = () => {
    const cleanDescription = description.trim();
    onSave({
      paidAt: date.toISOString(),
      paymentMode: mode,
      paymentDescription: cleanDescription || undefined,
      paymentProofUri: proofUri,
    });
  };

  const handleClear = () => {
    Alert.alert(
      "Mark as unpaid?",
      "This clears the payment date, mode, description, and proof photo.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark unpaid",
          style: "destructive",
          onPress: onClear,
        },
      ],
    );
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
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
                <View className="min-w-0 flex-1 pr-3">
                  <Text className="text-lg font-extrabold text-slate-900">
                    {isPaid ? "Payment details" : "Mark as paid"}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-slate-500">
                    {target.property.name} · {target.bill.name}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close"
                  className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                  onPress={onClose}
                >
                  <MaterialCommunityIcons
                    color="#475569"
                    name="close"
                    size={20}
                  />
                </Pressable>
              </View>

              {isPaid ? (
                <View className="mb-4 mt-2 flex-row items-center self-start rounded-full bg-[#e3f8f0] px-3 py-1">
                  <MaterialCommunityIcons
                    color="#047857"
                    name="check-circle"
                    size={14}
                  />
                  <Text className="ml-1 text-[11px] font-bold text-[#047857]">
                    Paid
                  </Text>
                </View>
              ) : (
                <View className="mb-4" />
              )}

              <Text className="mb-1.5 text-xs font-bold text-slate-700">
                Date paid
              </Text>
              <Pressable
                accessibilityLabel="Select payment date"
                className="h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3"
                onPress={() => setShowDatePicker((current) => !current)}
              >
                <Text className="text-base text-slate-900">
                  {formatDateMDY(date)}
                </Text>
                <MaterialCommunityIcons
                  color="#475569"
                  name="calendar-month-outline"
                  size={21}
                />
              </Pressable>
              {showDatePicker ? (
                <View className="mb-2 rounded-xl bg-slate-50 py-1">
                  <DateTimePicker
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    mode="date"
                    onChange={handleDateChange}
                    value={date}
                  />
                  {Platform.OS === "ios" ? (
                    <Pressable
                      className="self-end px-4 py-2"
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text className="text-sm font-bold text-[#4C45F5]">
                        Done
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <Text className="mb-1.5 mt-3 text-xs font-bold text-slate-700">
                Mode of payment
              </Text>
              <Pressable
                accessibilityLabel="Select payment mode"
                className="h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3"
                onPress={() => setShowModes((current) => !current)}
              >
                <Text className="text-base text-slate-900">{mode}</Text>
                <MaterialCommunityIcons
                  color="#475569"
                  name={showModes ? "chevron-up" : "chevron-down"}
                  size={21}
                />
              </Pressable>
              {showModes ? (
                <View className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {PAYMENT_MODES.map((option) => (
                    <Pressable
                      key={option}
                      accessibilityLabel={`Select ${option}`}
                      className="flex-row items-center justify-between border-b border-slate-100 px-3 py-3"
                      onPress={() => {
                        setMode(option);
                        setShowModes(false);
                      }}
                    >
                      <Text className="text-sm text-slate-800">{option}</Text>
                      {mode === option ? (
                        <MaterialCommunityIcons
                          color="#4C45F5"
                          name="check"
                          size={19}
                        />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text className="mb-1.5 mt-3 text-xs font-bold text-slate-700">
                Description (optional)
              </Text>
              <TextInput
                accessibilityLabel="Payment description"
                className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                multiline
                onChangeText={setDescription}
                placeholder="e.g. November electricity payment"
                placeholderTextColor="#94A3B8"
                textAlignVertical="top"
                value={description}
              />

              <PhotoEvidenceField
                addLabel="Add proof photo"
                cameraPermissionMessage="Camera access is needed to take the proof photo."
                label="Proof of payment (optional)"
                libraryPermissionMessage="Photo library access is needed to choose the proof photo."
                onChange={setProofUri}
                uri={proofUri}
              />

              <View className="mt-4 flex-row items-center gap-2">
                {isPaid && onClear ? (
                  <Pressable
                    accessibilityLabel="Mark as unpaid"
                    className="h-11 items-center justify-center rounded-xl border border-[#fecaca] px-3"
                    onPress={handleClear}
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
                  onPress={handleSave}
                >
                  <Text className="text-sm font-bold text-white">
                    {isPaid ? "Save" : "Mark paid"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
