import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import ZoomableImage from "../../components/ZoomableImage";
import "../../global.css";
import {
  getCashbookEntries,
  saveCashbookEntry,
  type CashbookEntryType,
} from "../lib/cashbook-Inbox";
import { getCashbooks, type Cashbook } from "../lib/cashbooks";
import { persistPhoto, resolvePhotoUri } from "../lib/photoStorage";

const paymentModes = ["Cash", "Bank transfer", "GCash", "Credit card", "Other"];

const parseAmount = (value: string) => {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

export default function CashbookEntryScreen() {
  const router = useRouter();
  const { cashbookId, entryId, selectCashbook, type } = useLocalSearchParams<{
    cashbookId?: string;
    entryId?: string;
    selectCashbook?: string;
    type?: CashbookEntryType;
  }>();
  const isEditing = Boolean(entryId);
  const isSelectingCashbook = selectCashbook === "true";
  const [cashbooks, setCashbooks] = useState<Cashbook[]>([]);
  const [selectedCashbookId, setSelectedCashbookId] = useState<
    string | undefined
  >(cashbookId);
  const [entryType, setEntryType] = useState<CashbookEntryType>(
    type === "cashOut" ? "cashOut" : "cashIn",
  );
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [createdAt, setCreatedAt] = useState<string | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPaymentModes, setShowPaymentModes] = useState(false);
  const [showCashbooks, setShowCashbooks] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const cashbookTitle =
    cashbooks.find((item) => item.id === selectedCashbookId)?.title ??
    "Cash book";

  useEffect(() => {
    void Promise.all([getCashbooks(), getCashbookEntries()]).then(
      ([cashbooks, entries]) => {
        setCashbooks(cashbooks);
        const initialCashbookId = cashbookId ?? undefined;
        setSelectedCashbookId(initialCashbookId);
        if (!entryId) return;
        const entry = entries.find((item) => item.id === entryId);
        if (!entry) return;
        setEntryType(entry.type);
        setAmount(String(entry.amount));
        setPaymentMode(entry.paymentMode);
        setDescription(entry.description);
        setDate(entry.date ? new Date(entry.date) : new Date());
        setImageUri(entry.imageUri);
        setCreatedAt(entry.createdAt);
      },
    );
  }, [cashbookId, entryId]);

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "set" && selectedDate) setDate(selectedDate);
  };

  const chooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Photo-library access is needed to add a picture.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Camera access is needed to take a picture.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const choosePhoto = () => {
    Alert.alert("Add photo", "Choose a photo source", [
      { text: "Cancel", style: "cancel" },
      { text: "Take photo", onPress: () => void takePhoto() },
      { text: "Choose from library", onPress: () => void chooseFromLibrary() },
    ]);
  };

  const handleSave = async () => {
    if (!selectedCashbookId) {
      Alert.alert(
        "Cash book required",
        isSelectingCashbook
          ? "Please select a cash book before saving this entry."
          : "Open this form from a cash book.",
      );
      return;
    }
    const parsedAmount = parseAmount(amount);
    if (parsedAmount <= 0) {
      Alert.alert("Amount required", "Enter an amount greater than zero.");
      return;
    }

    setIsSaving(true);
    try {
      // Keep the receipt photo in app-private storage instead of the
      // temporary image-picker cache.
      const storedImageUri = await persistPhoto(imageUri, "entry-photo");

      await saveCashbookEntry({
        id: entryId ?? `${Date.now()}`,
        cashbookId: selectedCashbookId,
        type: entryType,
        amount: parsedAmount,
        paymentMode,
        description: description.trim(),
        date: date.toISOString(),
        imageUri: storedImageUri ?? undefined,
        createdAt: createdAt ?? new Date().toISOString(),
      });
      router.back();
    } catch (error) {
      console.error("Unable to save cash-book entry:", error);
      Alert.alert(
        "Save failed",
        "Your cash entry could not be saved. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const canDeletePhoto = isEditing && Boolean(imageUri);

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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-5">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-emerald-700">
              {cashbookTitle}
            </Text>
            <Text className="mt-1 text-2xl font-bold text-slate-900">
              {isEditing ? "Edit cash entry" : "Add cash entry"}
            </Text>
          </View>

          {isSelectingCashbook ? (
            <>
              <Text className="mb-1.5 text-sm font-semibold text-slate-900">
                Cash book
              </Text>
              <Pressable
                className="mb-4 h-11 flex-row items-center justify-between rounded-xl border border-slate-200 px-3"
                onPress={() => setShowCashbooks(true)}
              >
                <Text
                  className={`text-base ${selectedCashbookId ? "text-slate-900" : "text-slate-400"}`}
                >
                  {selectedCashbookId ? cashbookTitle : "Select a cash book"}
                </Text>
                <Text className="text-slate-500">▾</Text>
              </Pressable>
            </>
          ) : null}

          <View className="mb-4 flex-row rounded-xl bg-slate-100 p-1">
            {(["cashIn", "cashOut"] as CashbookEntryType[]).map((type) => {
              const active = type === entryType;
              return (
                <Pressable
                  key={type}
                  className={`flex-1 rounded-lg py-2.5 ${active ? (type === "cashOut" ? "bg-rose-600" : "bg-emerald-700") : "bg-transparent"}`}
                  onPress={() => setEntryType(type)}
                >
                  <Text
                    className={`text-center font-bold ${active ? "text-white" : "text-slate-500"}`}
                  >
                    {type === "cashIn" ? "Cash in" : "Cash out"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="mb-1.5 text-sm font-semibold text-slate-900">
            Amount
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#94A3B8"
            className="mb-3 h-11 rounded-xl border border-slate-200 px-3 text-base text-slate-900"
          />

          <Text className="mb-1.5 text-sm font-semibold text-slate-900">
            Mode of Payment
          </Text>
          <Pressable
            className="mb-3 h-11 flex-row items-center justify-between rounded-xl border border-slate-200 px-3"
            onPress={() => setShowPaymentModes(true)}
          >
            <Text className="text-base text-slate-900">{paymentMode}</Text>
            <Text className="text-slate-500">▾</Text>
          </Pressable>

          <Text className="mb-1.5 text-sm font-semibold text-slate-900">
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={160}
            multiline
            textAlignVertical="top"
            placeholder="Add a note"
            placeholderTextColor="#94A3B8"
            className="mb-1 min-h-20 rounded-xl border border-slate-200 px-3 py-2.5 text-base text-slate-900"
          />
          <Text className="mb-3 text-[11px] font-bold text-slate-900">
            Max 160 characters
          </Text>

          <Text className="mb-1.5 text-sm font-semibold text-slate-900">
            Date
          </Text>
          <Pressable
            className="mb-3 h-11 flex-row items-center justify-between rounded-xl border border-slate-200 px-3"
            onPress={() => setShowDatePicker((current) => !current)}
          >
            <Text className="text-base font-semibold text-slate-900">
              {formatDate(date)}
            </Text>
            <MaterialCommunityIcons
              name="calendar-outline"
              size={20}
              color="#0F172A"
            />
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
            />
          ) : null}

          <View className="mb-6 mt-1 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-slate-900">
              {canDeletePhoto ? "Delete photo" : "Add photo"}
            </Text>
            <Pressable
              accessibilityLabel={canDeletePhoto ? "Delete photo" : "Add photo"}
              className="h-9 w-9 items-center justify-center rounded-full border border-slate-200"
              onPress={() => {
                if (canDeletePhoto) {
                  setImageUri(undefined);
                  return;
                }
                choosePhoto();
              }}
            >
              <MaterialCommunityIcons
                name={canDeletePhoto ? "trash-can-outline" : "camera-outline"}
                size={19}
                color={canDeletePhoto ? "#DC2626" : "#0F172A"}
              />
            </Pressable>
          </View>
          {imageUri ? (
            <Pressable
              className="mb-5 overflow-hidden rounded-xl border border-slate-200"
              onPress={() => setShowImagePreview(true)}
              accessibilityLabel="Preview entry image"
            >
              <Image
                source={{ uri: resolvePhotoUri(imageUri) ?? imageUri }}
                className="h-44 w-full"
                resizeMode="cover"
              />
            </Pressable>
          ) : null}
        </ScrollView>

        <View className="flex-row items-center gap-3 border-t border-slate-200 bg-white px-5 py-3 mb-18">
          <Pressable
            disabled={isSaving}
            onPress={() => void handleSave()}
            className={`rounded-xl bg-blue-700 px-5 py-3 shadow ${isSaving ? "opacity-60" : ""}`}
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

      <Modal
        transparent
        visible={showPaymentModes}
        animationType="fade"
        onRequestClose={() => setShowPaymentModes(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/30"
          onPress={() => setShowPaymentModes(false)}
        >
          <View className="rounded-t-3xl bg-white p-5">
            <Text className="mb-3 text-lg font-bold text-slate-900">
              Mode of Payment
            </Text>
            {paymentModes.map((mode) => (
              <Pressable
                key={mode}
                className="border-b border-slate-100 py-3"
                onPress={() => {
                  setPaymentMode(mode);
                  setShowPaymentModes(false);
                }}
              >
                <Text className="text-base text-slate-900">{mode}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showImagePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePreview(false)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center bg-black/95">
            <Pressable
              accessibilityLabel="Close image preview"
              className="absolute right-5 top-12 z-10 h-11 w-11 items-center justify-center rounded-full bg-white/20"
              onPress={() => setShowImagePreview(false)}
            >
              <MaterialCommunityIcons name="close" size={25} color="#FFFFFF" />
            </Pressable>
            {imageUri ? (
              <ZoomableImage uri={resolvePhotoUri(imageUri) ?? imageUri} />
            ) : null}
          </View>
        </GestureHandlerRootView>
      </Modal>

      <Modal
        transparent
        visible={showCashbooks}
        animationType="fade"
        onRequestClose={() => setShowCashbooks(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/30 px-6"
          onPress={() => setShowCashbooks(false)}
        >
          <View className="max-h-[70%] w-full rounded-2xl bg-white p-5">
            <Text className="mb-3 text-lg font-bold text-slate-900">
              Select a cash book
            </Text>
            {cashbooks.map((cashbook) => (
              <Pressable
                key={cashbook.id}
                className="border-b border-slate-100 py-3"
                onPress={() => {
                  setSelectedCashbookId(cashbook.id);
                  setShowCashbooks(false);
                }}
              >
                <Text className="text-base text-slate-900">
                  {cashbook.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
