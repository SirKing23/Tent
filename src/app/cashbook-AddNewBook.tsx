import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCashbookForm } from "../features/cashbooks/hooks/useCashbookForm";
import { formatDateMDY } from "../utils/date";

export default function CashbookFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const {
    draft,
    update,
    date,
    setDate,
    save,
    isSaving,
    isLoading,
    loadError,
  } = useCashbookForm(id);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (loadError === "not-found") {
      Alert.alert("Cash book not found", "It may have already been deleted.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else if (loadError === "failed") {
      Alert.alert("Error", "Unable to load this cash book.");
    }
  }, [loadError, router]);

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "set" && selectedDate) setDate(selectedDate);
  };

  const handleSave = async () => {
    try {
      const validation = await save();
      if (!validation.valid) {
        Alert.alert(validation.title, validation.message);
        return;
      }
      router.back();
    } catch (error) {
      console.error("Unable to save cash book:", error);
      Alert.alert(
        "Save failed",
        "Your cash book could not be saved. Please try again.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerTitle: isEditing
            ? "Edit Cash Notebook"
            : "Create Cash Notebook",
          headerShown: true,
          presentation: "card",
          animation: "slide_from_right",
        }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1">
          <View className="flex-1 overflow-hidden border border-slate-200 bg-white shadow-2xl">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 26, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? (
                <Text className="py-8 text-center text-slate-500">
                  Loading cash book...
                </Text>
              ) : (
                <>
                  <Text className="mb-1.5 text-sm font-semibold text-slate-900">
                    Title
                  </Text>
                  <TextInput
                    value={draft.title}
                    onChangeText={(value) => update("title", value)}
                    maxLength={80}
                    placeholder="Enter cash book title"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="next"
                    className="mb-1 min-h-11 rounded-xl border border-slate-200 px-3 text-base text-slate-900"
                  />
                  <Text className="mb-3 text-[11px] font-semibold text-slate-600">
                    Max 80 characters
                  </Text>

                  <Text className="mb-1.5 text-sm font-semibold text-slate-900">
                    Description
                  </Text>
                  <TextInput
                    value={draft.description}
                    onChangeText={(value) => update("description", value)}
                    maxLength={160}
                    multiline
                    textAlignVertical="top"
                    placeholder="What is this cash book for?"
                    placeholderTextColor="#94A3B8"
                    className="mb-1 min-h-20 rounded-xl border border-slate-200 px-3 py-2.5 text-base text-slate-900"
                  />
                  <Text className="mb-3 text-[11px] font-semibold text-slate-600">
                    Max 160 characters
                  </Text>

                  <Text className="mb-1.5 text-sm font-semibold text-slate-900">
                    Initial Cash in
                  </Text>
                  <TextInput
                    value={draft.initialCashIn}
                    onChangeText={(value) => update("initialCashIn", value)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    className="mb-3 min-h-11 rounded-xl border border-slate-200 px-3 text-base text-slate-900"
                  />

                  <Text className="mb-1.5 text-sm font-semibold text-slate-900">
                    Initial Cash out
                  </Text>
                  <TextInput
                    value={draft.initialCashOut}
                    onChangeText={(value) => update("initialCashOut", value)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    className="mb-3 min-h-11 rounded-xl border border-slate-200 px-3 text-base text-slate-900"
                  />

                  <Text className="mb-1.5 text-sm font-semibold text-slate-900">
                    Date
                  </Text>
                  <Pressable
                    onPress={() => setShowDatePicker((current) => !current)}
                    className="mb-2 min-h-11 flex-row items-center justify-between rounded-xl border border-slate-200 px-3"
                  >
                    <Text className="text-sm text-slate-900">
                      {formatDateMDY(date)}
                    </Text>
                    <Text className="text-lg text-slate-700">▦</Text>
                  </Pressable>

                  {showDatePicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={handleDateChange}
                    />
                  )}

                  <Pressable
                    onPress={() => update("autoCreateMonthly", !draft.autoCreateMonthly)}
                    className="mb-6 mt-2 min-h-10 flex-row items-center"
                  >
                    <View
                      className={`mr-2 h-5 w-5 items-center justify-center rounded border ${
                        draft.autoCreateMonthly
                          ? "border-white-700 bg-blue-700"
                          : "border-slate-400 bg-white"
                      }`}
                    >
                      {draft.autoCreateMonthly && (
                        <Text className="text-xs font-bold text-white">✓</Text>
                      )}
                    </View>
                    <Text className="flex-1 text-sm font-semibold text-slate-900">
                      Auto create monthly notebook
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
        <View className="flex-row items-center gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <Pressable
            disabled={isSaving}
            onPress={handleSave}
            className={`rounded-xl bg-blue-700 px-6 py-3 shadow ${
              isSaving ? "opacity-60" : ""
            }`}
          >
            <Text className="font-bold text-white">
              {isSaving ? "Saving..." : "Save"}
            </Text>
          </Pressable>

          <Pressable
            disabled={isSaving}
            onPress={() => router.back()}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <Text className="font-semibold text-slate-800">Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
