import Ionicons from "@react-native-vector-icons/ionicons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PHILIPPINE_ID_TYPES,
  TENANT_STATUSES,
} from "../constants/tenants";
import { FORM_SCROLL_OFFSET } from "../constants/ui";
import { PhotoField } from "../features/tenants/components/PhotoField";
import { useTenantForm } from "../features/tenants/hooks/useTenantForm";
import { useImageSourcePicker } from "../hooks/useImageSourcePicker";

type TenantTextField =
  | "firstName"
  | "middleName"
  | "lastName"
  | "phone"
  | "email"
  | "idNumber";

export default function TenantsAddNewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    draft: form,
    update,
    save: saveTenant,
    remove: removeTenant,
    isSaving,
  } = useTenantForm(id);
  const { pickImages } = useImageSourcePicker();
  const [idSearch, setIdSearch] = useState("");
  const [idMenuOpen, setIdMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // Auto-scroll support: remember each field's position and scroll the
  // focused one into view once the keyboard has shrunk the viewport.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const fieldY = useRef<Record<string, number>>({});
  const focusedField = useRef<string | null>(null);

  const scrollToField = useCallback((key: string | null) => {
    if (!key) return;
    const y = fieldY.current[key];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({
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

  const pickImage = async (
    target: "photo" | "idPhoto",
    source: "gallery" | "camera",
  ) => {
    const [uri] = await pickImages(source, {
      cameraPermissionMessage: "Camera access is needed to take this photo.",
      libraryPermissionMessage:
        "Photo library access is needed to choose an image.",
    });
    if (uri) update(target, uri);
  };

  const save = async () => {
    try {
      const validation = await saveTenant();
      if (!validation.valid) {
        Alert.alert(validation.title, validation.message);
        return;
      }
      router.back();
    } catch (error) {
      console.error("Unable to save tenant:", error);
      Alert.alert(
        "Save failed",
        "The tenant could not be saved. Please try again.",
      );
    }
  };

  const remove = () => {
    if (!id) return;
    Alert.alert(
      "Delete tenant?",
      "This will remove the tenant from the directory.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            void (async () => {
              await removeTenant();
              router.back();
            })(),
        },
      ],
    );
  };

  const input = (
    label: string,
    field: TenantTextField,
    placeholder: string,
    optional = false,
    keyboardType?: "default" | "phone-pad" | "email-address",
  ) => (
    <View
      style={styles.field}
      onLayout={(e: LayoutChangeEvent) => {
        fieldY.current[field] = e.nativeEvent.layout.y;
      }}
    >
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      <TextInput
        className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900"
        autoCapitalize={field === "email" ? "none" : "words"}
        keyboardType={keyboardType}
        onChangeText={(value) => update(field, value)}
        onFocus={() => {
          focusedField.current = field;
          scrollToField(field);
        }}
        placeholder={placeholder}
        placeholderTextColor="#96a4b7"
        style={styles.input}
        value={typeof form[field] === "string" ? (form[field] as string) : ""}
      />
    </View>
  );
  const idOptions = PHILIPPINE_ID_TYPES.filter((item) =>
    item.toLowerCase().includes(idSearch.trim().toLowerCase()),
  );

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50"
      edges={["bottom"]}
      style={styles.safe}
    >
      <Stack.Screen options={{ headerShown: true, title: "Tenants" }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-5">
            <Text className="text-xs font-bold uppercase tracking-[2px] text-emerald-700">
              Tenant Information
            </Text>
            <Text className="mt-1 text-2xl font-bold text-slate-900">
              {id ? "Edit Tenant" : "Create New Tenant"}
            </Text>
          </View>
          <PhotoField
            isProfile
            label="Profile picture"
            photo={form.photo}
            onImage={(source) => pickImage("photo", source)}
            onRemove={() => update("photo", null)}
          />
          {input("First Name", "firstName", "Enter first name")}
          {input("Middle Name", "middleName", "Enter middle name", true)}
          {input("Last Name", "lastName", "Enter last name")}
          {input(
            "Cellphone number",
            "phone",
            "Enter cellphone number",
            false,
            "phone-pad",
          )}
          {input(
            "Email address",
            "email",
            "Enter email address",
            true,
            "email-address",
          )}
          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <Pressable
              onPress={() => setStatusMenuOpen((current) => !current)}
              className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3"
              style={styles.select}
            >
              <Text style={styles.selectText}>{form.tenantStatus}</Text>
              <Ionicons
                color="#526986"
                name={statusMenuOpen ? "chevron-up" : "chevron-down"}
                size={18}
              />
            </Pressable>
            {statusMenuOpen ? (
              <View style={styles.dropdown}>
                {TENANT_STATUSES.map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => {
                      update("tenantStatus", status);
                      setStatusMenuOpen(false);
                    }}
                    style={styles.option}
                  >
                    <Text style={styles.optionText}>{status}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <Text
            className="mb-3 mt-1 text-base font-extrabold text-slate-900"
            style={styles.section}
          >
            Valid ID information
          </Text>
          <View
            style={styles.field}
            onLayout={(e: LayoutChangeEvent) => {
              fieldY.current.idType = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.label}>ID type</Text>
            <Pressable
              onPress={() => {
                setIdMenuOpen((current) => !current);
                setIdSearch("");
              }}
              style={styles.select}
            >
              <Text
                numberOfLines={1}
                style={form.idType ? styles.selectText : styles.placeholder}
              >
                {form.idType || "Select a Philippine valid ID"}
              </Text>
              <Ionicons
                color="#526986"
                name={idMenuOpen ? "chevron-up" : "chevron-down"}
                size={18}
              />
            </Pressable>
            {idMenuOpen ? (
              <View style={styles.dropdown}>
                <View style={styles.dropdownSearch}>
                  <Ionicons color="#7890ae" name="search-outline" size={17} />
                  <TextInput
                    className="flex-1 py-2.5 text-sm text-slate-900"
                    autoCapitalize="none"
                    onChangeText={setIdSearch}
                    onFocus={() => {
                      focusedField.current = "idType";
                      scrollToField("idType");
                    }}
                    placeholder="Search ID type..."
                    placeholderTextColor="#96a4b7"
                    style={styles.dropdownInput}
                    value={idSearch}
                  />
                </View>
                <ScrollView
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  style={styles.options}
                >
                  {idOptions.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => {
                        update("idType", item);
                        setIdMenuOpen(false);
                      }}
                      style={styles.option}
                    >
                      <Text style={styles.optionText}>{item}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
          {input("ID number", "idNumber", "Enter ID number")}
          <PhotoField
            label="Photo of ID"
            photo={form.idPhoto}
            onImage={(source) => pickImage("idPhoto", source)}
            onRemove={() => update("idPhoto", null)}
          />
          <Pressable
            className="mt-2 items-center justify-center rounded-2xl bg-indigo-600 py-3.5"
            disabled={isSaving}
            onPress={() => void save()}
            style={[styles.save, isSaving && styles.disabled]}
          >
            <Text
              className="text-sm font-extrabold text-white"
              style={styles.saveText}
            >
              {isSaving ? "Saving…" : id ? "Save changes" : "Create tenant"}
            </Text>
          </Pressable>
          {id ? (
            <Pressable
              className="mt-2 flex-row items-center justify-center gap-1.5 rounded-2xl border border-red-200 py-3"
              onPress={remove}
              style={styles.delete}
            >
              <Ionicons color="#cc4040" name="trash-outline" size={17} />
              <Text style={styles.deleteText}>Delete tenant</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: "#f7f9fc", flex: 1 },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  eyebrow: { color: "#637b99", fontSize: 12, marginBottom: 3 },
  title: {
    color: "#0d162a",
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 20,
  },
  field: { marginBottom: 14 },
  label: { color: "#29466c", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  optional: { color: "#8b9bb0", fontWeight: "400" },
  input: {
    backgroundColor: "#fff",
    borderColor: "#dfe7f0",
    borderRadius: 13,
    borderWidth: 1,
    color: "#1b2e49",
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  section: {
    color: "#0d162a",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 4,
  },
  select: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#dfe7f0",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 45,
    paddingHorizontal: 13,
  },
  selectText: { color: "#1b2e49", flex: 1, fontSize: 14, marginRight: 10 },
  placeholder: { color: "#96a4b7", flex: 1, fontSize: 14, marginRight: 10 },
  dropdown: {
    backgroundColor: "#fff",
    borderColor: "#dfe7f0",
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 6,
    overflow: "hidden",
  },
  dropdownSearch: {
    alignItems: "center",
    borderBottomColor: "#edf1f6",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  dropdownInput: {
    color: "#1b2e49",
    flex: 1,
    fontSize: 13,
    marginLeft: 7,
    paddingVertical: 10,
  },
  options: { maxHeight: 190 },
  option: {
    borderBottomColor: "#f0f3f7",
    borderBottomWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  optionText: { color: "#1b2e49", fontSize: 13 },
  save: {
    alignItems: "center",
    backgroundColor: "#5041df",
    borderRadius: 15,
    marginTop: 6,
    paddingVertical: 14,
  },
  disabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  delete: {
    alignItems: "center",
    borderColor: "#f0b5b5",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 12,
  },
  deleteText: { color: "#cc4040", fontSize: 13, fontWeight: "800" },
});
