import Ionicons from "@react-native-vector-icons/ionicons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
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
  FieldInput,
  FormFooter,
  SectionHeader,
  SelectField,
  formScreenStyles,
} from "../../components/FormKit";
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

  const textField = (
    label: string,
    field: TenantTextField,
    placeholder: string,
    options?: {
      optional?: boolean;
      keyboardType?: "default" | "phone-pad" | "email-address";
    },
  ) => (
    <FieldInput
      autoCapitalize={field === "email" ? "none" : "words"}
      keyboardType={options?.keyboardType}
      label={label}
      onChangeText={(value) => update(field, value)}
      onFocus={() => {
        focusedField.current = field;
        scrollToField(field);
      }}
      onLayout={(e) => {
        fieldY.current[field] = e.nativeEvent.layout.y;
      }}
      optional={options?.optional}
      placeholder={placeholder}
      value={typeof form[field] === "string" ? (form[field] as string) : ""}
    />
  );

  const idOptions = PHILIPPINE_ID_TYPES.filter((item) =>
    item.toLowerCase().includes(idSearch.trim().toLowerCase()),
  );

  return (
    <SafeAreaView edges={["bottom"]} style={formScreenStyles.safe}>
      <Stack.Screen options={{ headerShown: true, title: "Tenants" }} />
      <KeyboardAvoidingView behavior="padding" style={formScreenStyles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={formScreenStyles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={formScreenStyles.flex}
        >
          <SectionHeader
            eyebrow="Tenant information"
            title={id ? "Edit Tenant" : "Create New Tenant"}
          />

          <PhotoField
            isProfile
            label="Profile picture"
            photo={form.photo}
            onImage={(source) => pickImage("photo", source)}
            onRemove={() => update("photo", null)}
          />

          {textField("First Name", "firstName", "Enter first name")}
          {textField("Middle Name", "middleName", "Enter middle name", {
            optional: true,
          })}
          {textField("Last Name", "lastName", "Enter last name")}
          {textField(
            "Cellphone number",
            "phone",
            "Enter cellphone number",
            { keyboardType: "phone-pad" },
          )}
          {textField("Email address", "email", "Enter email address", {
            optional: true,
            keyboardType: "email-address",
          })}

          <SelectField
            icon={statusMenuOpen ? "chevron-up" : "chevron-down"}
            label="Status"
            onPress={() => setStatusMenuOpen((current) => !current)}
            value={form.tenantStatus}
          >
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
          </SelectField>

          <Text style={styles.section}>Valid ID information</Text>

          <SelectField
            icon={idMenuOpen ? "chevron-up" : "chevron-down"}
            label="ID type"
            onLayout={(e) => {
              fieldY.current.idType = e.nativeEvent.layout.y;
            }}
            onPress={() => {
              setIdMenuOpen((current) => !current);
              setIdSearch("");
            }}
            placeholder="Select a Philippine valid ID"
            value={form.idType}
          >
            {idMenuOpen ? (
              <View style={styles.dropdown}>
                <View style={styles.dropdownSearch}>
                  <Ionicons color="#7890ae" name="search-outline" size={17} />
                  <TextInput
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
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
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
          </SelectField>

          {textField("ID number", "idNumber", "Enter ID number")}

          <PhotoField
            label="Photo of ID"
            photo={form.idPhoto}
            onImage={(source) => pickImage("idPhoto", source)}
            onRemove={() => update("idPhoto", null)}
          />

          {id ? (
            <Pressable onPress={remove} style={styles.deleteBtn}>
              <Ionicons color="#cc4040" name="trash-outline" size={17} />
              <Text style={styles.deleteBtnText}>Delete tenant</Text>
            </Pressable>
          ) : null}

          <View style={formScreenStyles.bottomSpacer} />
        </ScrollView>

        <FormFooter
          onCancel={() => router.back()}
          onSubmit={() => void save()}
          submitLabel={id ? "Save Changes" : "Create Tenant"}
          isSubmitting={isSaving}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    color: "#0d162a",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 4,
  },
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
  deleteBtn: {
    alignItems: "center",
    borderColor: "#f0b5b5",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 4,
    paddingVertical: 12,
  },
  deleteBtnText: { color: "#cc4040", fontSize: 13, fontWeight: "800" },
});
