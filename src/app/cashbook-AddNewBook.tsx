import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
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
import { useCashbookForm } from "../features/cashbooks/hooks/useCashbookForm";
import { getActiveCurrency } from "../utils/currency";
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

  const currencySymbol = getActiveCurrency().symbol;

  return (
    <SafeAreaView edges={["bottom"]} style={formScreenStyles.safe}>
      <Stack.Screen
        options={{
          headerTitle: "Cash Notebook",
          headerShown: true,
          presentation: "card",
          animation: "slide_from_right",
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
            eyebrow="Cash notebook"
            title={isEditing ? "Edit Cash Notebook" : "Create Cash Notebook"}
          />

          {isLoading ? (
            <Text style={styles.loadingText}>Loading cash book...</Text>
          ) : (
            <>
              <FieldInput
                hint="Max 80 characters"
                label="Title"
                maxLength={80}
                onChangeText={(value) => update("title", value)}
                placeholder="Enter cash book title"
                value={draft.title}
              />

              <FieldInput
                autoCapitalize="sentences"
                hint="Max 160 characters"
                label="Description"
                maxLength={160}
                multiline
                onChangeText={(value) => update("description", value)}
                optional
                placeholder="What is this cash book for?"
                value={draft.description}
              />

              <FieldInput
                keyboardType="decimal-pad"
                label={`Initial Cash in (${currencySymbol})`}
                onChangeText={(value) => update("initialCashIn", value)}
                placeholder="0.00"
                value={draft.initialCashIn}
              />

              <FieldInput
                keyboardType="decimal-pad"
                label={`Initial Cash out (${currencySymbol})`}
                onChangeText={(value) => update("initialCashOut", value)}
                placeholder="0.00"
                value={draft.initialCashOut}
              />

              <SelectField
                icon="calendar-outline"
                label="Date"
                onPress={() => setShowDatePicker(true)}
                value={formatDateMDY(date)}
              />

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draft.autoCreateMonthly }}
                onPress={() =>
                  update("autoCreateMonthly", !draft.autoCreateMonthly)
                }
                style={styles.checkRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    draft.autoCreateMonthly && styles.checkboxChecked,
                  ]}
                >
                  {draft.autoCreateMonthly ? (
                    <Ionicons color="#fff" name="checkmark" size={14} />
                  ) : null}
                </View>
                <Text style={styles.checkLabel}>
                  Auto create monthly notebook
                </Text>
              </Pressable>
            </>
          )}

          <View style={formScreenStyles.bottomSpacer} />
        </ScrollView>

        <FormFooter
          onCancel={() => router.back()}
          onSubmit={() => void handleSave()}
          submitLabel={isEditing ? "Save Changes" : "Create Cash Notebook"}
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
                  style={styles.modalDoneBtn}
                >
                  <Text style={styles.modalDoneText}>Done</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    color: "#637b99",
    fontSize: 14,
    paddingVertical: 32,
    textAlign: "center",
  },
  checkRow: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#dfe7f0",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#c4d0e0",
    borderRadius: 7,
    borderWidth: 2,
    flexShrink: 0,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkboxChecked: { backgroundColor: "#0f766e", borderColor: "#0f766e" },
  checkLabel: { color: "#29466c", flex: 1, fontSize: 13, fontWeight: "700" },

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
  modalDoneBtn: {
    backgroundColor: "#5041df",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalDoneText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
