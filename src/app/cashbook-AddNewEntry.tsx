import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import ZoomableImage from "../../components/ZoomableImage";
import "../../global.css";
import {
  FieldInput,
  FormFooter,
  SectionHeader,
  SelectField,
  formScreenStyles,
} from "../../components/FormKit";
import { useCashbookEntryForm } from "../features/cashbooks/hooks/useCashbookEntryForm";
import type { CashbookEntryType } from "../features/cashbooks/types";
import { useImageSourcePicker } from "../hooks/useImageSourcePicker";
import { resolvePhotoUri } from "../services/photoStorage";
import { getActiveCurrency } from "../utils/currency";
import { formatDateMDY } from "../utils/date";

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
  const {
    cashbooks,
    cashbookTitle,
    selectedCashbookId,
    setSelectedCashbookId,
    entryType,
    setEntryType,
    amount,
    setAmount,
    paymentMode,
    setPaymentMode,
    description,
    setDescription,
    date,
    setDate,
    imageUri,
    setImageUri,
    isSaving,
    save,
    paymentModes,
  } = useCashbookEntryForm({
    cashbookId,
    entryId,
    type,
    isSelectingCashbook,
  });
  const { pickImages } = useImageSourcePicker();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPaymentModes, setShowPaymentModes] = useState(false);
  const [showCashbooks, setShowCashbooks] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "set" && selectedDate) setDate(selectedDate);
  };

  const chooseFromLibrary = async () => {
    const [uri] = await pickImages("gallery");
    if (uri) setImageUri(uri);
  };

  const takePhoto = async () => {
    const [uri] = await pickImages("camera", {
      cameraPermissionMessage: "Camera access is needed to take a picture.",
    });
    if (uri) setImageUri(uri);
  };

  const choosePhoto = () => {
    Alert.alert("Add photo", "Choose a photo source", [
      { text: "Cancel", style: "cancel" },
      { text: "Take photo", onPress: () => void takePhoto() },
      { text: "Choose from library", onPress: () => void chooseFromLibrary() },
    ]);
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
      console.error("Unable to save cash-book entry:", error);
      Alert.alert(
        "Save failed",
        "Your cash entry could not be saved. Please try again.",
      );
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={formScreenStyles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Cash Notebook",
        }}
      />
      <KeyboardAvoidingView behavior="padding" style={formScreenStyles.flex}>
        <ScrollView
          contentContainerStyle={formScreenStyles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={formScreenStyles.flex}
        >
          <SectionHeader
            eyebrow={cashbookTitle}
            title={isEditing ? "Edit Cash Entry" : "Add Cash Entry"}
          />

          {isSelectingCashbook ? (
            <SelectField
              label="Cash book"
              onPress={() => setShowCashbooks(true)}
              placeholder="Select a cash book"
              value={selectedCashbookId ? cashbookTitle : ""}
            />
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Entry type</Text>
            <View style={styles.typeToggle}>
              {(["cashIn", "cashOut"] as CashbookEntryType[]).map((option) => {
                const active = option === entryType;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    key={option}
                    onPress={() => setEntryType(option)}
                    style={[
                      styles.typeOption,
                      active &&
                        (option === "cashOut"
                          ? styles.typeOptionOut
                          : styles.typeOptionIn),
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        active && styles.typeOptionTextActive,
                      ]}
                    >
                      {option === "cashIn" ? "Cash in" : "Cash out"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <FieldInput
            keyboardType="decimal-pad"
            label={`Amount (${getActiveCurrency().symbol})`}
            onChangeText={setAmount}
            placeholder="0.00"
            value={amount}
          />

          <SelectField
            label="Mode of Payment"
            onPress={() => setShowPaymentModes(true)}
            value={paymentMode}
          />

          <FieldInput
            autoCapitalize="sentences"
            hint="Max 160 characters"
            label="Description"
            maxLength={160}
            multiline
            onChangeText={setDescription}
            optional
            placeholder="Add a note"
            value={description}
          />

          <SelectField
            icon="calendar-outline"
            label="Date"
            onPress={() => setShowDatePicker(true)}
            value={formatDateMDY(date)}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Receipt photo</Text>
            <Pressable
              accessibilityLabel={
                imageUri ? "Preview receipt photo" : "Add receipt photo"
              }
              accessibilityRole="button"
              onPress={() => {
                if (imageUri) {
                  setShowImagePreview(true);
                  return;
                }
                choosePhoto();
              }}
              style={[
                styles.photoCard,
                !imageUri && styles.photoCardEmpty,
              ]}
            >
              {imageUri ? (
                <Image
                  resizeMode="cover"
                  source={{ uri: resolvePhotoUri(imageUri) ?? imageUri }}
                  style={styles.photoImage}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialCommunityIcons
                    color="#70839d"
                    name="camera-outline"
                    size={26}
                  />
                  <Text style={styles.photoPlaceholderText}>
                    Add a photo of the receipt
                  </Text>
                </View>
              )}
            </Pressable>
            {imageUri ? (
              <Pressable
                accessibilityLabel="Remove receipt photo"
                accessibilityRole="button"
                onPress={() => setImageUri(undefined)}
                style={styles.removePhoto}
              >
                <MaterialCommunityIcons
                  color="#cc4040"
                  name="trash-can-outline"
                  size={16}
                />
                <Text style={styles.removePhotoText}>Remove photo</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={formScreenStyles.bottomSpacer} />
        </ScrollView>

        <FormFooter
          onCancel={() => router.back()}
          onSubmit={() => void handleSave()}
          submitLabel={isEditing ? "Save Changes" : "Add Cash Entry"}
          isSubmitting={isSaving}
        />
      </KeyboardAvoidingView>

      {showDatePicker && Platform.OS === "android" ? (
        <DateTimePicker
          value={date}
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
                <Text style={styles.modalTitle}>Select date</Text>
                <Pressable
                  accessibilityLabel="Done selecting date"
                  accessibilityRole="button"
                  onPress={() => setShowDatePicker(false)}
                  style={styles.doneBtn}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      <Modal
        transparent
        visible={showPaymentModes}
        animationType="fade"
        onRequestClose={() => setShowPaymentModes(false)}
      >
        <Pressable
          accessibilityLabel="Close payment modes"
          onPress={() => setShowPaymentModes(false)}
          style={styles.modalOverlay}
        >
          <Pressable onPress={() => undefined} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mode of Payment</Text>
              <Pressable
                accessibilityLabel="Close payment modes"
                accessibilityRole="button"
                onPress={() => setShowPaymentModes(false)}
                style={styles.closeBtn}
              >
                <MaterialCommunityIcons
                  color="#475569"
                  name="close"
                  size={20}
                />
              </Pressable>
            </View>
            {paymentModes.map((mode) => (
              <Pressable
                accessibilityState={{ selected: mode === paymentMode }}
                key={mode}
                onPress={() => {
                  setPaymentMode(mode);
                  setShowPaymentModes(false);
                }}
                style={styles.optionRow}
              >
                <Text style={styles.optionText}>{mode}</Text>
                {mode === paymentMode ? (
                  <MaterialCommunityIcons
                    color="#5041df"
                    name="check"
                    size={20}
                  />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={showCashbooks}
        animationType="fade"
        onRequestClose={() => setShowCashbooks(false)}
      >
        <Pressable
          accessibilityLabel="Close cash book selection"
          onPress={() => setShowCashbooks(false)}
          style={styles.modalOverlay}
        >
          <Pressable onPress={() => undefined} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a cash book</Text>
              <Pressable
                accessibilityLabel="Close cash book selection"
                accessibilityRole="button"
                onPress={() => setShowCashbooks(false)}
                style={styles.closeBtn}
              >
                <MaterialCommunityIcons
                  color="#475569"
                  name="close"
                  size={20}
                />
              </Pressable>
            </View>
            {cashbooks.map((cashbook) => (
              <Pressable
                accessibilityState={{
                  selected: cashbook.id === selectedCashbookId,
                }}
                key={cashbook.id}
                onPress={() => {
                  setSelectedCashbookId(cashbook.id);
                  setShowCashbooks(false);
                }}
                style={styles.optionRow}
              >
                <Text style={styles.optionText}>{cashbook.title}</Text>
                {cashbook.id === selectedCashbookId ? (
                  <MaterialCommunityIcons
                    color="#5041df"
                    name="check"
                    size={20}
                  />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showImagePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePreview(false)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.previewOverlay}>
            <Pressable
              accessibilityLabel="Close image preview"
              accessibilityRole="button"
              onPress={() => setShowImagePreview(false)}
              style={styles.previewClose}
            >
              <MaterialCommunityIcons name="close" size={25} color="#FFFFFF" />
            </Pressable>
            {imageUri ? (
              <ZoomableImage uri={resolvePhotoUri(imageUri) ?? imageUri} />
            ) : null}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: {
    color: "#29466c",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },

  typeToggle: {
    backgroundColor: "#fff",
    borderColor: "#dfe7f0",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  typeOption: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  typeOptionIn: { backgroundColor: "#0f766e" },
  typeOptionOut: { backgroundColor: "#cc4040" },
  typeOptionText: { color: "#637b99", fontSize: 14, fontWeight: "700" },
  typeOptionTextActive: { color: "#fff" },

  photoCard: {
    borderColor: "#dfe7f0",
    borderRadius: 13,
    borderWidth: 1,
    height: 160,
    overflow: "hidden",
  },
  photoCardEmpty: { borderColor: "#c4d0e0", borderStyle: "dashed" },
  photoImage: { height: 160, width: "100%" },
  photoPlaceholder: {
    alignItems: "center",
    backgroundColor: "#fff",
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  photoPlaceholderText: { color: "#70839d", fontSize: 12, fontWeight: "600" },
  removePhoto: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 5,
    marginTop: 8,
    paddingVertical: 4,
  },
  removePhotoText: { color: "#cc4040", fontSize: 12, fontWeight: "700" },

  modalOverlay: {
    backgroundColor: "rgba(4,10,24,0.32)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: { color: "#0d162a", fontSize: 18, fontWeight: "800" },
  closeBtn: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  doneBtn: {
    backgroundColor: "#5041df",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  optionRow: {
    alignItems: "center",
    borderBottomColor: "#f0f3f7",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  optionText: { color: "#1b2e49", flex: 1, fontSize: 14 },

  previewOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(2,6,23,0.95)",
    flex: 1,
    justifyContent: "center",
  },
  previewClose: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    top: 48,
    width: 44,
    zIndex: 10,
  },
});
