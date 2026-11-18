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
import { getCashbooks, saveCashbook, type Cashbook } from "../lib/cashbooks";

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

const parseAmount = (value: string) => {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function CashbookFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [initialCashIn, setInitialCashIn] = useState("");
  const [initialCashOut, setInitialCashOut] = useState("");
  const [date, setDate] = useState(new Date());
  const [autoCreateMonthly, setAutoCreateMonthly] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const loadCashbook = async () => {
      try {
        const cashbooks = await getCashbooks();
        const cashbook = cashbooks.find((item) => item.id === id);

        if (!cashbook) {
          Alert.alert(
            "Cash book not found",
            "It may have already been deleted.",
            [{ text: "OK", onPress: () => router.back() }],
          );
          return;
        }

        if (!isMounted) return;

        setTitle(cashbook.title);
        setDescription(cashbook.description);
        setInitialCashIn(String(cashbook.initialCashIn ?? 0));
        setInitialCashOut(String(cashbook.initialCashOut ?? 0));
        setDate(cashbook.date ? new Date(cashbook.date) : new Date());
        setAutoCreateMonthly(cashbook.autoCreateMonthly ?? false);
      } catch (error) {
        console.error("Unable to load cash book:", error);
        Alert.alert("Error", "Unable to load this cash book.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadCashbook();

    return () => {
      isMounted = false;
    };
  }, [id, router]);

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "set" && selectedDate) setDate(selectedDate);
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      Alert.alert("Title required", "Please enter a name for this cash book.");
      return;
    }

    setIsSaving(true);

    try {
      const existing = id
        ? (await getCashbooks()).find((item) => item.id === id)
        : undefined;

      const cashbook: Cashbook = {
        id: id ?? `${Date.now()}`,
        title: cleanTitle,
        description: description.trim(),
        initialCashIn: parseAmount(initialCashIn),
        initialCashOut: parseAmount(initialCashOut),
        date: date.toISOString(),
        autoCreateMonthly,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };

      await saveCashbook(cashbook);
      router.back();
    } catch (error) {
      console.error("Unable to save cash book:", error);
      Alert.alert(
        "Save failed",
        "Your cash book could not be saved. Please try again.",
      );
    } finally {
      setIsSaving(false);
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
                    value={title}
                    onChangeText={setTitle}
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
                    value={description}
                    onChangeText={setDescription}
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
                    value={initialCashIn}
                    onChangeText={setInitialCashIn}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    className="mb-3 min-h-11 rounded-xl border border-slate-200 px-3 text-base text-slate-900"
                  />

                  <Text className="mb-1.5 text-sm font-semibold text-slate-900">
                    Initial Cash out
                  </Text>
                  <TextInput
                    value={initialCashOut}
                    onChangeText={setInitialCashOut}
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
                      {formatDate(date)}
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
                    onPress={() => setAutoCreateMonthly((current) => !current)}
                    className="mb-6 mt-2 min-h-10 flex-row items-center"
                  >
                    <View
                      className={`mr-2 h-5 w-5 items-center justify-center rounded border ${
                        autoCreateMonthly
                          ? "border-white-700 bg-blue-700"
                          : "border-slate-400 bg-white"
                      }`}
                    >
                      {autoCreateMonthly && (
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
