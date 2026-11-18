import Ionicons from "@react-native-vector-icons/ionicons";
import * as ImagePicker from "expo-image-picker";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
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
  deleteTenantRecord,
  getTenants,
  saveTenantRecord,
  type Tenant,
} from "../lib/tenants";

const PHILIPPINE_ID_TYPES = [
  "PhilSys National ID (PhilID / ePhilID)",
  "Philippine Passport",
  "Driver's License",
  "Unified Multi-Purpose ID (UMID)",
  "SSS ID",
  "GSIS eCard",
  "PRC ID",
  "Postal ID",
  "COMELEC Voter's ID / Certification",
  "PhilHealth ID",
  "TIN ID",
  "NBI Clearance",
  "Police Clearance",
  "Senior Citizen ID",
  "PWD ID",
  "Solo Parent ID",
  "OFW / OWWA ID",
  "Seaman's Book",
  "Barangay ID",
  "IBP ID",
  "Pag-IBIG ID",
  "Other valid government-issued ID",
];
const TENANT_STATUSES = ["Active", "Inactive", "Reserved"] as const;

type Form = Omit<Tenant, "id">;
const EMPTY: Form = {
  tenantStatus: "Active",
  photo: null,
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  email: "",
  idType: "",
  idNumber: "",
  idPhoto: null,
};

export default function TenantsAddNewScreen() {
  const SCROLL_OFFSET = 120;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [form, setForm] = useState<Form>({ ...EMPTY });
  const [isSaving, setIsSaving] = useState(false);
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
    scrollRef.current?.scrollTo({ y: Math.max(0, y - SCROLL_OFFSET), animated: true });
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () =>
      scrollToField(focusedField.current),
    );
    return () => sub.remove();
  }, [scrollToField]);


  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void (async () => {
        const tenant = (await getTenants()).find((item) => item.id === id);
        if (tenant) setForm({ ...tenant });
      })();
    }, [id]),
  );

  const update = (field: keyof Form, value: Form[keyof Form]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const pickImage = async (
    target: "photo" | "idPhoto",
    source: "gallery" | "camera",
  ) => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        source === "camera"
          ? "Camera access is needed to take this photo."
          : "Photo library access is needed to choose an image.",
      );
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: false,
            quality: 0.8,
            mediaTypes: ["images"],
          });
    if (!result.canceled) update(target, result.assets[0].uri);
  };

  const save = async () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.phone.trim() ||
      !form.idType.trim() ||
      !form.idNumber.trim()
    ) {
      Alert.alert(
        "Missing information",
        "Add first name, last name, cellphone number, and valid ID information.",
      );
      return;
    }
    setIsSaving(true);
    await saveTenantRecord({ ...form, id: id ?? Date.now().toString() });
    setIsSaving(false);
    router.back();
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
              await deleteTenantRecord(id);
              router.back();
            })(),
        },
      ],
    );
  };

  const input = (
    label: string,
    field: keyof Form,
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]} style={styles.safe}>
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
          <Text className="mb-3 mt-1 text-base font-extrabold text-slate-900" style={styles.section}>Valid ID information</Text>
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
              <Text className="text-sm font-extrabold text-white" style={styles.saveText}>
              {isSaving ? "Saving…" : id ? "Save changes" : "Create tenant"}
            </Text>
          </Pressable>
          {id ? (
            <Pressable className="mt-2 flex-row items-center justify-center gap-1.5 rounded-2xl border border-red-200 py-3" onPress={remove} style={styles.delete}>
              <Ionicons color="#cc4040" name="trash-outline" size={17} />
              <Text style={styles.deleteText}>Delete tenant</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PhotoField({
  label,
  photo,
  onImage,
  onRemove,
  isProfile = false,
}: {
  label: string;
  photo: string | null;
  onImage: (source: "gallery" | "camera") => void;
  onRemove: () => void;
  isProfile?: boolean;
}) {
  const choose = () =>
    Alert.alert("Add photo", "Choose a photo source", [
      { text: "Cancel", style: "cancel" },
      { text: "Take photo", onPress: () => void onImage("camera") },
      { text: "Choose from library", onPress: () => void onImage("gallery") },
    ]);
  if (isProfile) {
    return (
      <View style={styles.profileField}>
        <Text style={[styles.label, styles.profileLabel]}>{label}</Text>
        <View style={styles.profileWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Ionicons color="#70839d" name="person" size={46} />
            </View>
          )}
          <Pressable
            accessibilityLabel={photo ? "Edit profile picture" : "Add profile picture"}
            onPress={choose}
            style={styles.profileAction}
          >
            <Ionicons color="#fff" name={photo ? "pencil" : "camera-outline"} size={16} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.photoField}>
      <View style={styles.photoHeader}>
        <Text style={styles.label}>{photo ? "Delete photo" : label}</Text>
        <Pressable
          onPress={photo ? onRemove : choose}
          style={styles.photoAction}
        >
          <Ionicons
            color={photo ? "#cc4040" : "#22324a"}
            name={photo ? "trash-outline" : "camera-outline"}
            size={19}
          />
        </Pressable>
      </View>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.preview} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons color="#70839d" name="image-outline" size={24} />
        </View>
      )}
    </View>
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
  profileField: { alignItems: "center", marginBottom: 20 },
  profileLabel: { alignSelf: "stretch", marginBottom: 10 },
  profileWrap: { height: 112, position: "relative", width: 112 },
  profileImage: { borderRadius: 56, height: 112, width: 112 },
  profilePlaceholder: { alignItems: "center", backgroundColor: "#e9eef5", borderColor: "#d5dfeb", borderRadius: 56, borderWidth: 1, height: 112, justifyContent: "center", width: 112 },
  profileAction: { alignItems: "center", backgroundColor: "#5041df", borderColor: "#f7f9fc", borderRadius: 17, borderWidth: 3, bottom: -2, height: 34, justifyContent: "center", position: "absolute", right: 2, width: 34 },
  photoField: { marginBottom: 16 },
  photoHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  photoAction: {
    alignItems: "center",
    borderColor: "#dfe7f0",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  photoPlaceholder: {
    alignItems: "center",
    backgroundColor: "#e9eef5",
    borderColor: "#d5dfeb",
    borderRadius: 15,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  preview: { borderRadius: 15, height: 160, width: 160 },
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
