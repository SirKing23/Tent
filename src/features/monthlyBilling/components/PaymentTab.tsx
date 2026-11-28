import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useImperativeHandle, useRef, useState, type Ref } from "react";
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type HostInstance,
  type TextInputInstance,
} from "react-native";

import { PAYMENT_MODES, type PaymentMode } from "../../../constants/payments";
import { formatDateMDY } from "../../../utils/date";
import type { MonthlyBillEntry } from "../types";
import { PhotoEvidenceField } from "./PhotoEvidenceField";

export type PaymentValues = {
  paidAt: string;
  paymentMode: PaymentMode;
  paymentDescription?: string;
  paymentProofUri?: string;
};

/** The dialog owns the action row, so the tab exposes its save through a ref. */
export type PaymentTabHandle = { save: () => void };

/** Payment fields shown as a tab in the entry dialog. */
export function PaymentTab({
  ref,
  entry,
  onSave,
  onFieldFocus,
}: {
  ref?: Ref<PaymentTabHandle>;
  entry?: MonthlyBillEntry;
  onSave: (values: PaymentValues) => void;
  /** Lets the dialog scroll this field above the keyboard. */
  onFieldFocus?: (field: HostInstance | null) => void;
}) {
  const [date, setDate] = useState(
    entry?.paidAt ? new Date(entry.paidAt) : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mode, setMode] = useState<PaymentMode>(
    entry?.paymentMode ?? PAYMENT_MODES[0],
  );
  const [showModes, setShowModes] = useState(false);
  const [description, setDescription] = useState(
    entry?.paymentDescription ?? "",
  );
  const [proofUri, setProofUri] = useState<string | undefined>(
    entry?.paymentProofUri,
  );
  const descriptionRef = useRef<TextInputInstance>(null);

  const isPaid = Boolean(entry?.paidAt);

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

  useImperativeHandle(ref, () => ({ save: handleSave }));

  return (
    <View>
      {isPaid ? (
        <View className="mb-3 flex-row items-center self-start rounded-full bg-[#e3f8f0] px-3 py-1">
          <MaterialCommunityIcons
            color="#047857"
            name="check-circle"
            size={14}
          />
          <Text className="ml-1 text-[11px] font-bold text-[#047857]">
            Paid
          </Text>
        </View>
      ) : null}

      <Text className="mb-1.5 text-xs font-bold text-slate-700">Date paid</Text>
      <Pressable
        accessibilityLabel="Select payment date"
        className="h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3"
        onPress={() => setShowDatePicker((current) => !current)}
      >
        <Text className="text-base text-slate-900">{formatDateMDY(date)}</Text>
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
              <Text className="text-sm font-bold text-[#4C45F5]">Done</Text>
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
        onFocus={() => onFieldFocus?.(descriptionRef.current)}
        placeholder="e.g. November electricity payment"
        placeholderTextColor="#94A3B8"
        ref={descriptionRef}
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
    </View>
  );
}
