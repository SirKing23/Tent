import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  Modal,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "../../global.css";
import { getBillingItems, type BillingItem, type UtilityType } from "../lib/bills";
import {
  deletePropertyRecord,
  getBuildings,
  getChildUnits,
  getProperties,
  savePropertyRecord,
  type Property,
  type PropertyType,
} from "../lib/properties";
import { persistPhoto, resolvePhotoUri } from "../lib/photoStorage";
import { getTenants, type Tenant } from "../lib/tenants";

// ─── helpers ────────────────────────────────────────────────────────────────

// How far above the focused input the form scrolls to. Larger = scrolls less,
// smaller = scrolls more (the input lands closer to the top of the screen).
const SCROLL_OFFSET = 120;

const getTenantName = (t: Tenant) =>
  [t.firstName, t.middleName, t.lastName].filter(Boolean).join(" ");

const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getUtilityIcon = (u: UtilityType) => {
  switch (u) {
    case "Internet":    return "wifi";
    case "Water":       return "water-outline";
    case "Electricity": return "flash-outline";
    case "Rent":        return "home-city-outline";
    default:            return "file-document-outline";
  }
};

const getUtilityIconStyle = (u: UtilityType) => {
  switch (u) {
    case "Internet":    return { bg: "#EEF2FF", icon: "#4F46E5" };
    case "Water":       return { bg: "#E0F7FA", icon: "#0891B2" };
    case "Electricity": return { bg: "#FEF3C7", icon: "#D97706" };
    case "Rent":        return { bg: "#FFEDD5", icon: "#C2410C" };
    default:            return { bg: "#F1F5F9", icon: "#475569" };
  }
};

// ─── step indices ────────────────────────────────────────────────────────────

const STEPS = [
  "Property Info",
  "Bills",
  "Tenants",
  "Photos",
  "Summary",
] as const;
type Step = 0 | 1 | 2 | 3 | 4;

// ─── form type ───────────────────────────────────────────────────────────────

type Form = {
  name: string;
  type: PropertyType;
  parentBuildingId: string | null;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  country: string;
  photos: string[];
  billIds: string[];
  subMeterBillIds: string[];
  tenantIds: string[];
};

const EMPTY: Form = {
  name: "",
  type: "Building",
  parentBuildingId: null,
  street: "",
  barangay: "",
  city: "",
  province: "",
  zipCode: "",
  country: "Philippines",
  photos: [],
  billIds: [],
  subMeterBillIds: [],
  tenantIds: [],
};

// ─── Bill detail modal ───────────────────────────────────────────────────────

function BillDetailModal({
  bill,
  onClose,
}: {
  bill: BillingItem | null;
  onClose: () => void;
}) {
  if (!bill) return null;
  const { bg, icon } = getUtilityIconStyle(bill.utilityType);
  return (
    <Modal animationType="slide" transparent onRequestClose={onClose} visible>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={[styles.modalIconWrap, { backgroundColor: bg }]}>
            <MaterialCommunityIcons
              color={icon}
              name={getUtilityIcon(bill.utilityType)}
              size={32}
            />
          </View>
          <Text style={styles.modalTitle}>{bill.name}</Text>
          <Text style={styles.modalSub}>
            {bill.utilityType} · {bill.billingType}
          </Text>
          {bill.defaultAmount !== undefined && (
            <Text style={styles.modalAmount}>
              {formatCurrency(bill.defaultAmount)}
            </Text>
          )}
          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>Display unit</Text>
            <Text style={styles.modalValue}>{bill.displayUnit || "—"}</Text>
          </View>
          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>Due date</Text>
            <Text style={styles.modalValue}>{bill.dueDateType}</Text>
          </View>
          {bill.fixedDueDate ? (
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Fixed date</Text>
              <Text style={styles.modalValue}>{bill.fixedDueDate}</Text>
            </View>
          ) : null}
          {bill.recurringRule ? (
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Recurring rule</Text>
              <Text style={styles.modalValue}>{bill.recurringRule}</Text>
            </View>
          ) : null}
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Tenant detail modal ─────────────────────────────────────────────────────

function TenantDetailModal({
  tenant,
  onClose,
}: {
  tenant: Tenant | null;
  onClose: () => void;
}) {
  if (!tenant) return null;
  const statusBg =
    tenant.tenantStatus === "Active"
      ? "#e3f8f0"
      : tenant.tenantStatus === "Inactive"
        ? "#fff1dd"
        : "#eef0ff";
  const statusColor =
    tenant.tenantStatus === "Active"
      ? "#009a61"
      : tenant.tenantStatus === "Inactive"
        ? "#d96a00"
        : "#5146e5";

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose} visible>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {tenant.photo ? (
            <Image
              source={{ uri: resolvePhotoUri(tenant.photo) ?? tenant.photo }}
              style={styles.tenantModalPhoto}
            />
          ) : (
            <View style={styles.tenantModalAvatar}>
              <Text style={styles.tenantModalAvatarText}>
                {`${tenant.firstName[0] ?? ""}${tenant.lastName[0] ?? ""}`}
              </Text>
            </View>
          )}
          <Text style={styles.modalTitle}>{getTenantName(tenant)}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>
              {tenant.tenantStatus}
            </Text>
          </View>
          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>Phone</Text>
            <Text style={styles.modalValue}>{tenant.phone}</Text>
          </View>
          {tenant.email ? (
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Email</Text>
              <Text style={styles.modalValue}>{tenant.email}</Text>
            </View>
          ) : null}
          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>ID type</Text>
            <Text style={styles.modalValue}>{tenant.idType}</Text>
          </View>
          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>ID number</Text>
            <Text style={styles.modalValue}>{tenant.idNumber}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function PropertiesAddNewScreen() {
  const router = useRouter();
  const {
    id,
    parentBuildingId: presetParentBuildingId,
    type: presetType,
  } = useLocalSearchParams<{
    id?: string;
    parentBuildingId?: string;
    type?: string;
  }>();

  // Units created from a building's Units page arrive pre-set to "Unit"
  // with their parent building locked.
  const isNewUnit =
    !id && presetType === "Unit" && Boolean(presetParentBuildingId);

  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<Form>({
    ...EMPTY,
    parentBuildingId: presetParentBuildingId ?? null,
    type: presetType === "Unit" ? "Unit" : "Building",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Data sources
  const [bills, setBills] = useState<BillingItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Property[]>([]);

  // Modals
  const [previewBill, setPreviewBill] = useState<BillingItem | null>(null);
  const [previewTenant, setPreviewTenant] = useState<Tenant | null>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [buildingMenuOpen, setBuildingMenuOpen] = useState(false);

  // "Use parent building address" toggle
  const [useParentAddress, setUseParentAddress] = useState(false);

  const scrollRef = useRef<ScrollViewInstance>(null);

  // Auto-scroll support: remember each input's position and scroll the
  // focused one into view once the keyboard has shrunk the viewport.
  const fieldY = useRef<Record<string, number>>({});
  const focusedField = useRef<string | null>(null);

  const scrollToField = useCallback((key: string | null) => {
    if (!key) return;
    const y = fieldY.current[key];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, y - SCROLL_OFFSET),
      animated: true,
    });
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () =>
      scrollToField(focusedField.current),
    );
    return () => sub.remove();
  }, [scrollToField]);

  // Load everything when screen focuses (also re-loads after navigating back
  // from Add New Bill / Add New Tenant)
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const [billsData, tenantsData, buildingsData] = await Promise.all([
          getBillingItems(),
          getTenants(),
          getBuildings(),
        ]);
        setBills(billsData);
        setTenants(tenantsData);
        setBuildings(buildingsData);

        if (id) {
          const all = await getProperties();
          const existing = all.find((p) => p.id === id);
          if (existing) {
            setForm({
              name: existing.name,
              type: existing.type,
              parentBuildingId: existing.parentBuildingId,
              street: existing.street,
              barangay: existing.barangay,
              city: existing.city,
              province: existing.province,
              zipCode: existing.zipCode,
              country: existing.country,
              photos: existing.photos ?? [],
              billIds: existing.billIds,
              subMeterBillIds: existing.subMeterBillIds ?? [],
              tenantIds: existing.tenantIds,
            });
          }
        }
      };
      void load();
    }, [id]),
  );

  const update = <K extends keyof Form>(field: K, value: Form[K]) =>
    setForm((cur) => ({ ...cur, [field]: value }));

  // Copy a building's address fields into the form
  const applyParentAddress = useCallback(
    (buildingId: string) => {
      const building = buildings.find((b) => b.id === buildingId);
      if (!building) return;
      setForm((cur) => ({
        ...cur,
        street: building.street,
        barangay: building.barangay,
        city: building.city,
        province: building.province,
        zipCode: building.zipCode,
        country: building.country,
      }));
    },
    [buildings],
  );

  // Clear address fields back to empty
  const clearAddress = () =>
    setForm((cur) => ({
      ...cur,
      street: "",
      barangay: "",
      city: "",
      province: "",
      zipCode: "",
      country: "Philippines",
    }));

  const toggleBill = (billId: string) =>
    setForm((current) => {
      const isSelected = current.billIds.includes(billId);
      return {
        ...current,
        billIds: isSelected
          ? current.billIds.filter((id) => id !== billId)
          : [...current.billIds, billId],
        subMeterBillIds: isSelected
          ? current.subMeterBillIds.filter((id) => id !== billId)
          : current.subMeterBillIds,
      };
    });

  const toggleSubMeterBill = (billId: string) =>
    setForm((current) => ({
      ...current,
      subMeterBillIds: current.subMeterBillIds.includes(billId)
        ? current.subMeterBillIds.filter((id) => id !== billId)
        : [...current.subMeterBillIds, billId],
    }));

  const toggleTenant = (tenantId: string) =>
    update(
      "tenantIds",
      form.tenantIds.includes(tenantId)
        ? form.tenantIds.filter((x) => x !== tenantId)
        : [...form.tenantIds, tenantId],
    );

  // ── photos ─────────────────────────────────────────────────────────────────

  const pickPhotos = async (source: "gallery" | "camera") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        source === "camera"
          ? "Camera access is needed to take a photo."
          : "Photo library access is needed to choose photos.",
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
            allowsMultipleSelection: true,
            quality: 0.8,
            mediaTypes: ["images"],
            selectionLimit: 0,
          });
    if (result.canceled) return;
    update("photos", [
      ...form.photos,
      ...result.assets.map((asset) => asset.uri),
    ]);
  };

  const choosePhotoSource = () =>
    Alert.alert("Add photo", "Choose a photo source", [
      { text: "Cancel", style: "cancel" },
      { text: "Take photo", onPress: () => void pickPhotos("camera") },
      { text: "Choose from library", onPress: () => void pickPhotos("gallery") },
    ]);

  const removePhoto = (index: number) =>
    update(
      "photos",
      form.photos.filter((_, i) => i !== index),
    );

  // ── validation ─────────────────────────────────────────────────────────────

  const validateStep0 = () => {
    if (!form.name.trim()) {
      Alert.alert("Missing field", "Please enter a Property Name.");
      return false;
    }
    if (!form.street.trim() || !form.city.trim() || !form.province.trim()) {
      Alert.alert(
        "Missing address",
        "Please fill in Street, City, and Province.",
      );
      return false;
    }
    if (form.type === "Unit" && !form.parentBuildingId) {
      Alert.alert(
        "Missing field",
        "Please select the Building this unit belongs to.",
      );
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 0 && !validateStep0()) return;
    setStep((s) => Math.min(s + 1, 4) as Step);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0) as Step);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // ── save ───────────────────────────────────────────────────────────────────

  const save = async () => {
    setIsSaving(true);
    try {
      // Copy freshly picked photos into app-private storage; existing
      // app-private paths are returned unchanged.
      const photos = (
        await Promise.all(
          form.photos.map((photo) => persistPhoto(photo, "property-photo")),
        )
      ).filter((photo): photo is string => Boolean(photo));

      await savePropertyRecord({
        id: id ?? Date.now().toString(),
        name: form.name.trim(),
        type: form.type,
        parentBuildingId: form.parentBuildingId,
        street: form.street.trim(),
        barangay: form.barangay.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        zipCode: form.zipCode.trim(),
        country: form.country.trim() || "Philippines",
        photos,
        billIds: form.billIds,
        subMeterBillIds: form.subMeterBillIds.filter((billId) => {
          const bill = bills.find((item) => item.id === billId);
          return (
            form.billIds.includes(billId) &&
            form.type === "Unit" &&
            Boolean(
              buildings
                .find((building) => building.id === form.parentBuildingId)
                ?.billIds.includes(billId),
            ) &&
            (bill?.billingType === "Total consumption" ||
              bill?.billingType === "Meter reading")
          );
        }),
        tenantIds: form.tenantIds,
        createdAt: new Date().toISOString(),
      });
      router.back();
    } catch (error) {
      console.error("Unable to save property:", error);
      Alert.alert(
        "Save failed",
        "The property could not be saved. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const remove = () => {
    if (!id) return;

    // A building can only be removed once its units are gone or reassigned.
    void (async () => {
      const childUnits = await getChildUnits(id);
      if (childUnits.length) {
        Alert.alert(
          "Building has units",
          `This building still has ${childUnits.length} unit${
            childUnits.length === 1 ? "" : "s"
          }. Reassign or delete those units first.`,
        );
        return;
      }

      Alert.alert(
        "Delete property?",
        "This will remove the property from the directory.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () =>
              void (async () => {
                await deletePropertyRecord(id);
                router.back();
              })(),
          },
        ],
      );
    })();
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: id
            ? "Edit Property"
            : isNewUnit
              ? "New Unit"
              : "New Property",
        }}
      />

      {/* ── Progress indicator ───────────────────────────────────────────── */}
      <View style={styles.progress}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.progressItem}>
            <View
              style={[
                styles.progressDot,
                i === step && styles.progressDotActive,
                i < step && styles.progressDotDone,
              ]}
            >
              {i < step ? (
                <Ionicons color="#fff" name="checkmark" size={12} />
              ) : (
                <Text
                  style={[
                    styles.progressDotText,
                    i === step && styles.progressDotTextActive,
                  ]}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.progressLabel,
                i === step && styles.progressLabelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Scrollable content & Nav wrapped in KeyboardAvoidingView ───────── */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.flex}
        >
        {/* ── STEP 0 ── Property Information ─────────────────────────── */}
        {step === 0 && (
          <View>
            <SectionHeader
              eyebrow="Step 1 of 5"
              title={
                id
                  ? "Edit Property Info"
                  : isNewUnit
                    ? "Unit Information"
                    : "Property Information"
              }
            />

            <FieldInput
              label="Property Name"
              onChangeText={(v) => update("name", v)}
              onFocus={() => {
                focusedField.current = "name";
                scrollToField("name");
              }}
              onLayout={(e: LayoutChangeEvent) => {
                fieldY.current.name = e.nativeEvent.layout.y;
              }}
              placeholder="e.g. Oakwood Building A"
              value={form.name}
            />

            {/* Type dropdown — locked when adding a unit to a building */}
            <View style={styles.field}>
              <Text style={styles.label}>Type</Text>
              <Pressable
                accessibilityState={{ disabled: isNewUnit }}
                disabled={isNewUnit}
                onPress={() => setTypeMenuOpen((o) => !o)}
                style={[styles.select, isNewUnit && styles.inputLocked]}
              >
                <Text
                  style={[
                    form.type ? styles.selectText : styles.placeholder,
                    isNewUnit && styles.lockedText,
                  ]}
                >
                  {form.type || "Select type"}
                </Text>
                <Ionicons
                  color={isNewUnit ? "#96a4b7" : "#526986"}
                  name={isNewUnit ? "lock-closed" : typeMenuOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                />
              </Pressable>
              {typeMenuOpen && !isNewUnit && (
                <View style={styles.dropdown}>
                  {(["Building", "Unit"] as PropertyType[]).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => {
                        update("type", t);
                        if (t === "Building") update("parentBuildingId", null);
                        if (t === "Building") {
                          setUseParentAddress(false);
                          clearAddress();
                        }
                        setTypeMenuOpen(false);
                      }}
                      style={styles.option}
                    >
                      <Text style={styles.optionText}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Building selector — only when type is Unit */}
            {form.type === "Unit" && (
              <View style={styles.field}>
                <Text style={styles.label}>Parent Building</Text>
                <Pressable
                  accessibilityState={{ disabled: isNewUnit }}
                  disabled={isNewUnit}
                  onPress={() => setBuildingMenuOpen((o) => !o)}
                  style={[styles.select, isNewUnit && styles.inputLocked]}
                >
                  <Text
                    numberOfLines={1}
                    style={
                      form.parentBuildingId
                        ? [styles.selectText, isNewUnit && styles.lockedText]
                        : styles.placeholder
                    }
                  >
                    {form.type === "Unit"
                      ? (buildings.find((b) => b.id === form.parentBuildingId)
                          ?.name ??
                        (isNewUnit
                          ? "Parent building unavailable"
                          : "Select a building"))
                      : "Select a building"}
                  </Text>
                  <Ionicons
                    color={isNewUnit ? "#96a4b7" : "#526986"}
                    name={
                      isNewUnit
                        ? "lock-closed"
                        : buildingMenuOpen
                          ? "chevron-up"
                          : "chevron-down"
                    }
                    size={16}
                  />
                </Pressable>
                {buildingMenuOpen && !isNewUnit && (
                  <View style={styles.dropdown}>
                    {buildings.length === 0 ? (
                      <View style={styles.option}>
                        <Text style={[styles.optionText, { color: "#8b9bb0" }]}>
                          No buildings saved yet
                        </Text>
                      </View>
                    ) : (
                      buildings.map((b) => (
                        <Pressable
                          key={b.id}
                          onPress={() => {
                            update("parentBuildingId", b.id);
                            if (useParentAddress) applyParentAddress(b.id);
                            setBuildingMenuOpen(false);
                          }}
                          style={styles.option}
                        >
                          <Text style={styles.optionText}>{b.name}</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}

            <Text style={styles.sectionSub}>Address</Text>

            {/* "Use parent building address" checkbox — only shown when a building is selected */}
            {form.type === "Unit" && form.parentBuildingId ? (
              <Pressable
                onPress={() => {
                  const next = !useParentAddress;
                  setUseParentAddress(next);
                  if (next) {
                    applyParentAddress(form.parentBuildingId!);
                  } else {
                    clearAddress();
                  }
                }}
                style={styles.useParentRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    useParentAddress && styles.checkboxChecked,
                    styles.useParentCheckbox,
                  ]}
                >
                  {useParentAddress && (
                    <Ionicons color="#fff" name="checkmark" size={14} />
                  )}
                </View>
                <View style={styles.useParentText}>
                  <Text style={styles.useParentLabel}>
                    Use parent building address
                  </Text>
                  <Text style={styles.useParentSub}>
                    {useParentAddress
                      ? "Address copied from building — fields are locked"
                      : "Auto-fill address from the selected building"}
                  </Text>
                </View>
              </Pressable>
            ) : null}

            <FieldInput
              editable={!useParentAddress}
              label="Street / House No."
              onChangeText={(v) => update("street", v)}
              onFocus={() => {
                focusedField.current = "street";
                scrollToField("street");
              }}
              onLayout={(e: LayoutChangeEvent) => {
                fieldY.current.street = e.nativeEvent.layout.y;
              }}
              placeholder="e.g. 123 Rizal St."
              value={form.street}
            />
            <FieldInput
              editable={!useParentAddress}
              label="Barangay"
              onChangeText={(v) => update("barangay", v)}
              onFocus={() => {
                focusedField.current = "barangay";
                scrollToField("barangay");
              }}
              onLayout={(e: LayoutChangeEvent) => {
                fieldY.current.barangay = e.nativeEvent.layout.y;
              }}
              optional
              placeholder="e.g. Barangay Poblacion"
              value={form.barangay}
            />
            <FieldInput
              editable={!useParentAddress}
              label="City / Municipality"
              onChangeText={(v) => update("city", v)}
              onFocus={() => {
                focusedField.current = "city";
                scrollToField("city");
              }}
              onLayout={(e: LayoutChangeEvent) => {
                fieldY.current.city = e.nativeEvent.layout.y;
              }}
              placeholder="e.g. Makati City"
              value={form.city}
            />
            <FieldInput
              editable={!useParentAddress}
              label="Province"
              onChangeText={(v) => update("province", v)}
              onFocus={() => {
                focusedField.current = "province";
                scrollToField("province");
              }}
              onLayout={(e: LayoutChangeEvent) => {
                fieldY.current.province = e.nativeEvent.layout.y;
              }}
              placeholder="e.g. Metro Manila"
              value={form.province}
            />
            <FieldInput
              editable={!useParentAddress}
              keyboardType="numeric"
              label="ZIP Code"
              onChangeText={(v) => update("zipCode", v)}
              onFocus={() => {
                focusedField.current = "zipCode";
                scrollToField("zipCode");
              }}
              onLayout={(e: LayoutChangeEvent) => {
                fieldY.current.zipCode = e.nativeEvent.layout.y;
              }}
              optional
              placeholder="e.g. 1200"
              value={form.zipCode}
            />
            <FieldInput
              editable={!useParentAddress}
              label="Country"
              onChangeText={(v) => update("country", v)}
              onFocus={() => {
                focusedField.current = "country";
                scrollToField("country");
              }}
              onLayout={(e: LayoutChangeEvent) => {
                fieldY.current.country = e.nativeEvent.layout.y;
              }}
              placeholder="Philippines"
              value={form.country}
            />
          </View>
        )}

        {/* ── STEP 1 ── Bills ──────────────────────────────────────────── */}
        {step === 1 && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <SectionHeader
                eyebrow="Step 2 of 5"
                subtitle="Tap to select · tap ⓘ for details · long-press for details"
                title="Bills"
              />
              <Pressable
                accessibilityLabel="Add new bill"
                onPress={() => router.push("/bills-AddNewBill")}
                style={styles.plusButton}
              >
                <Ionicons color="#fff" name="add" size={20} />
              </Pressable>
            </View>

            {bills.length === 0 ? (
              <EmptyState
                icon="file-document-outline"
                subtitle="Tap + to create your first billing item."
                title="No bills saved"
              />
            ) : (
              bills.map((bill) => {
                const { bg, icon } = getUtilityIconStyle(bill.utilityType);
                const checked = form.billIds.includes(bill.id);
                const isSubMeterEligible =
                  bill.billingType === "Total consumption" ||
                  bill.billingType === "Meter reading";
                const isSubMeter = form.subMeterBillIds.includes(bill.id);
                const parentBuilding = buildings.find(
                  (building) => building.id === form.parentBuildingId,
                );
                const alsoInParentBuilding =
                  form.type === "Unit" &&
                  parentBuilding?.billIds.includes(bill.id);
                const dueSummary =
                  bill.dueDateType === "Fixed date"
                    ? (bill.fixedDueDate ?? bill.dueDateType)
                    : bill.dueDateType === "Recurring monthly" &&
                        bill.recurringRule === "Day of the month"
                      ? `Day ${bill.recurringDay ?? "—"} of each month`
                      : (bill.recurringRule ?? bill.dueDateType);

                return (
                  <Pressable
                    key={bill.id}
                    delayLongPress={300}
                    onLongPress={() => setPreviewBill(bill)}
                    onPress={() => toggleBill(bill.id)}
                    style={[
                      styles.selectable,
                      checked && styles.selectableChecked,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        checked && styles.checkboxChecked,
                      ]}
                    >
                      {checked && (
                        <Ionicons color="#fff" name="checkmark" size={14} />
                      )}
                    </View>

                    <View
                      style={[styles.billIconWrap, { backgroundColor: bg }]}
                    >
                      <MaterialCommunityIcons
                        color={icon}
                        name={getUtilityIcon(bill.utilityType)}
                        size={28}
                      />
                    </View>

                    <View style={styles.billInfo}>
                      <View style={styles.billRow}>
                        <Text numberOfLines={1} style={styles.billName}>
                          {bill.name}
                        </Text>
                        <Text style={styles.billAmount}>
                          {bill.defaultAmount === undefined
                            ? "—"
                            : formatCurrency(bill.defaultAmount)}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={styles.billSub}>
                        {bill.billingType}
                      </Text>
                      {alsoInParentBuilding ? (
                        <View style={styles.billBadges}>
                          <View style={styles.parentBillBadge}>
                            <MaterialCommunityIcons
                              color="#4F46E5"
                              name="office-building-outline"
                              size={12}
                            />
                            <Text style={styles.parentBillBadgeText}>
                              Also in {parentBuilding?.name ?? "building"}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                      {checked &&
                      alsoInParentBuilding &&
                      isSubMeterEligible ? (
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isSubMeter }}
                          onPress={(event) => {
                            event.stopPropagation();
                            toggleSubMeterBill(bill.id);
                          }}
                          style={[
                            styles.subMeterToggle,
                            isSubMeter && styles.subMeterToggleSelected,
                          ]}
                        >
                          <MaterialCommunityIcons
                            color={isSubMeter ? "#0F766E" : "#64748B"}
                            name={
                              isSubMeter
                                ? "checkbox-marked-circle"
                                : "checkbox-blank-circle-outline"
                            }
                            size={15}
                          />
                          <Text
                            style={[
                              styles.subMeterToggleText,
                              isSubMeter && styles.subMeterToggleTextSelected,
                            ]}
                          >
                            Sub-meter
                          </Text>
                        </Pressable>
                      ) : null}
                      <View style={styles.billFooter}>
                        <Text numberOfLines={1} style={styles.billFooterText}>
                          {bill.displayUnit || "No display unit"} · {dueSummary}
                        </Text>
                        <View style={styles.duePill}>
                          <Text style={styles.duePillText}>
                            {bill.dueDateType}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Pressable
                      hitSlop={8}
                      onPress={() => setPreviewBill(bill)}
                      style={styles.infoBtn}
                    >
                      <Ionicons
                        color="#8b9bb0"
                        name="information-circle-outline"
                        size={20}
                      />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* ── STEP 2 ── Tenants ────────────────────────────────────────── */}
        {step === 2 && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <SectionHeader
                eyebrow="Step 3 of 5"
                subtitle="Tap to select · tap ⓘ for details"
                title="Tenants"
              />
              <Pressable
                accessibilityLabel="Add new tenant"
                onPress={() => router.push("/tenants-AddNewTenants")}
                style={styles.plusButton}
              >
                <Ionicons color="#fff" name="add" size={20} />
              </Pressable>
            </View>

            {tenants.length === 0 ? (
              <EmptyState
                icon="account-group-outline"
                subtitle="Tap + to create your first tenant."
                title="No tenants saved"
              />
            ) : (
              tenants.map((tenant) => {
                const checked = form.tenantIds.includes(tenant.id);
                const statusBg =
                  tenant.tenantStatus === "Active"
                    ? "#e3f8f0"
                    : tenant.tenantStatus === "Inactive"
                      ? "#fff1dd"
                      : "#eef0ff";
                const statusColor =
                  tenant.tenantStatus === "Active"
                    ? "#009a61"
                    : tenant.tenantStatus === "Inactive"
                      ? "#d96a00"
                      : "#5146e5";

                return (
                  <Pressable
                    key={tenant.id}
                    delayLongPress={300}
                    onLongPress={() => setPreviewTenant(tenant)}
                    onPress={() => toggleTenant(tenant.id)}
                    style={[
                      styles.selectable,
                      checked && styles.selectableChecked,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        checked && styles.checkboxChecked,
                      ]}
                    >
                      {checked && (
                        <Ionicons color="#fff" name="checkmark" size={14} />
                      )}
                    </View>

                    {tenant.photo ? (
                      <Image
                        source={{
                          uri: resolvePhotoUri(tenant.photo) ?? tenant.photo,
                        }}
                        style={styles.tenantAvatar}
                      />
                    ) : (
                      <View style={styles.tenantAvatarPlaceholder}>
                        <Text style={styles.tenantAvatarText}>
                          {`${tenant.firstName[0] ?? ""}${tenant.lastName[0] ?? ""}`}
                        </Text>
                      </View>
                    )}

                    <View style={styles.tenantInfo}>
                      <Text numberOfLines={1} style={styles.tenantName}>
                        {getTenantName(tenant)}
                      </Text>
                      <View style={styles.tenantMeta}>
                        <View
                          style={[
                            styles.tenantStatusPill,
                            { backgroundColor: statusBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tenantStatusText,
                              { color: statusColor },
                            ]}
                          >
                            {tenant.tenantStatus}
                          </Text>
                        </View>
                        <Text style={styles.tenantPhone}>{tenant.phone}</Text>
                      </View>
                      <Text numberOfLines={1} style={styles.tenantEmail}>
                        {tenant.email || "No email"}
                      </Text>
                    </View>

                    <Pressable
                      hitSlop={8}
                      onPress={() => setPreviewTenant(tenant)}
                      style={styles.infoBtn}
                    >
                      <Ionicons
                        color="#8b9bb0"
                        name="information-circle-outline"
                        size={20}
                      />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* ── STEP 3 ── Photos ─────────────────────────────────────────── */}
        {step === 3 && (
          <View>
            <SectionHeader
              eyebrow="Step 4 of 5"
              subtitle="The first photo is used as the cover image"
              title="Photos"
            />

            <View style={styles.photoGrid}>
              {form.photos.map((photo, index) => (
                <View key={`${photo}-${index}`} style={styles.photoTile}>
                  <Image
                    source={{ uri: resolvePhotoUri(photo) ?? photo }}
                    style={styles.photoTileImage}
                  />
                  {index === 0 ? (
                    <View style={styles.photoCoverBadge}>
                      <Text style={styles.photoCoverText}>Cover</Text>
                    </View>
                  ) : null}
                  <Pressable
                    accessibilityLabel={`Remove photo ${index + 1}`}
                    hitSlop={6}
                    onPress={() => removePhoto(index)}
                    style={styles.photoRemove}
                  >
                    <Ionicons color="#fff" name="close" size={13} />
                  </Pressable>
                </View>
              ))}

              <Pressable
                accessibilityLabel="Add photo"
                onPress={choosePhotoSource}
                style={styles.photoAdd}
              >
                <Ionicons color="#5041df" name="camera-outline" size={22} />
                <Text style={styles.photoAddText}>Add photo</Text>
              </Pressable>
            </View>

            <Text style={styles.photoHint}>
              {form.photos.length
                ? `${form.photos.length} photo${form.photos.length !== 1 ? "s" : ""} added · tap × to remove`
                : "Take a photo with the camera or choose one from your library."}
            </Text>
          </View>
        )}

        {/* ── STEP 4 ── Summary ────────────────────────────────────────── */}
        {step === 4 && (
          <View>
            <SectionHeader
              eyebrow="Step 5 of 5"
              subtitle="Review the details before saving"
              title="Summary"
            />

            <View style={styles.summaryCard}>
              <SummarySection title="Property Information">
                <SummaryRow label="Name" value={form.name || "—"} />
                <SummaryRow label="Type" value={form.type} />
                {form.type === "Unit" && (
                  <SummaryRow
                    label="Parent Building"
                    value={
                      buildings.find((b) => b.id === form.parentBuildingId)
                        ?.name ?? "—"
                    }
                  />
                )}
              </SummarySection>

              <View style={styles.summaryDivider} />

              <SummarySection title="Address">
                <SummaryRow label="Street" value={form.street || "—"} />
                {form.barangay ? (
                  <SummaryRow label="Barangay" value={form.barangay} />
                ) : null}
                <SummaryRow label="City" value={form.city || "—"} />
                <SummaryRow label="Province" value={form.province || "—"} />
                {form.zipCode ? (
                  <SummaryRow label="ZIP" value={form.zipCode} />
                ) : null}
                <SummaryRow label="Country" value={form.country || "—"} />
              </SummarySection>

              <View style={styles.summaryDivider} />

              <SummarySection
                title={`Bills (${form.billIds.length} selected)`}
              >
                {form.billIds.length === 0 ? (
                  <Text style={styles.summaryNone}>No bills linked</Text>
                ) : (
                  bills
                    .filter((b) => form.billIds.includes(b.id))
                    .map((b) => (
                      <SummaryRow
                        key={b.id}
                        label={b.name}
                        value={b.utilityType}
                      />
                    ))
                )}
              </SummarySection>

              <View style={styles.summaryDivider} />

              <SummarySection
                title={`Tenants (${form.tenantIds.length} selected)`}
              >
                {form.tenantIds.length === 0 ? (
                  <Text style={styles.summaryNone}>No tenants linked</Text>
                ) : (
                  tenants
                    .filter((t) => form.tenantIds.includes(t.id))
                    .map((t) => (
                      <SummaryRow
                        key={t.id}
                        label={getTenantName(t)}
                        value={t.tenantStatus}
                      />
                    ))
                )}
              </SummarySection>

              <View style={styles.summaryDivider} />

              <SummarySection title={`Photos (${form.photos.length})`}>
                {form.photos.length === 0 ? (
                  <Text style={styles.summaryNone}>No photos added</Text>
                ) : (
                  <ScrollView
                    horizontal
                    contentContainerStyle={styles.summaryPhotos}
                    showsHorizontalScrollIndicator={false}
                  >
                    {form.photos.map((photo, index) => (
                      <Image
                        key={`${photo}-${index}`}
                        source={{ uri: resolvePhotoUri(photo) ?? photo }}
                        style={styles.summaryPhoto}
                      />
                    ))}
                  </ScrollView>
                )}
              </SummarySection>
            </View>

            <Pressable
              disabled={isSaving}
              onPress={() => void save()}
              style={[styles.saveBtn, isSaving && styles.disabled]}
            >
              <Text style={styles.saveBtnText}>
                {isSaving
                  ? "Saving…"
                  : id
                    ? "Save Changes"
                    : "Create Property"}
              </Text>
            </Pressable>

            {id ? (
              <Pressable onPress={remove} style={styles.deleteBtn}>
                <Ionicons color="#cc4040" name="trash-outline" size={17} />
                <Text style={styles.deleteBtnText}>Delete property</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Bottom navigation buttons ────────────────────────────────────── */}
      <View style={styles.nav}>
        <Pressable
          disabled={step === 0}
          onPress={goBack}
          style={[styles.navBtn, styles.navBack, step === 0 && styles.disabled]}
        >
          <Ionicons color="#334155" name="arrow-back" size={18} />
          <Text style={styles.navBackText}>Back</Text>
        </Pressable>

        {step < 4 ? (
          <Pressable onPress={goNext} style={[styles.navBtn, styles.navNext]}>
            <Text style={styles.navNextText}>Next</Text>
            <Ionicons color="#fff" name="arrow-forward" size={18} />
          </Pressable>
        ) : null}
      </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <BillDetailModal
        bill={previewBill}
        onClose={() => setPreviewBill(null)}
      />
      <TenantDetailModal
        tenant={previewTenant}
        onClose={() => setPreviewTenant(null)}
      />
    </SafeAreaView>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function FieldInput({
  label,
  placeholder,
  value,
  onChangeText,
  optional = false,
  keyboardType = "default",
  editable = true,
  onLayout,
  onFocus,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  optional?: boolean;
  keyboardType?: "default" | "numeric" | "phone-pad" | "email-address";
  editable?: boolean;
  onLayout?: (e: LayoutChangeEvent) => void;
  onFocus?: () => void;
}) {
  return (
    <View onLayout={onLayout} style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional ? (
          <Text style={styles.optional}> (optional)</Text>
        ) : null}
      </Text>
      <TextInput
        autoCapitalize="words"
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor="#96a4b7"
        style={[styles.input, !editable && styles.inputLocked]}
        value={value}
      />
    </View>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons color="#2563EB" name={icon} size={36} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.summarySection}>
      <Text style={styles.summarySectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { backgroundColor: "#f7f9fc", flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },

  // Progress bar
  progress: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e4eaf2",
  },
  progressItem: { flex: 1, alignItems: "center", gap: 4 },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e4eaf2",
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: { backgroundColor: "#5041df" },
  progressDotDone:   { backgroundColor: "#0f766e" },
  progressDotText:   { color: "#8b9bb0", fontSize: 12, fontWeight: "700" },
  progressDotTextActive: { color: "#fff" },
  progressLabel:       { color: "#8b9bb0", fontSize: 9, fontWeight: "600", textAlign: "center" },
  progressLabelActive: { color: "#5041df", fontWeight: "800" },

  // Section header
  sectionHead: { marginBottom: 20 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  eyebrow: {
    color: "#637b99",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title:    { color: "#0d162a", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#637b99", fontSize: 13, marginTop: 3 },
  sectionSub: {
    color: "#0d162a",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 4,
  },

  inputLocked: {
    backgroundColor: "#f0f4f9",
    borderColor: "#dfe7f0",
    color: "#7890ae",
  },
  lockedText: { color: "#7890ae" },

  // "Use parent address" row
  useParentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef9f5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#b8e8d8",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 12,
  },
  useParentCheckbox: {
    // slightly larger than inner checkboxes to stand out
    width: 26,
    height: 26,
    borderRadius: 8,
    flexShrink: 0,
  },
  useParentText: { flex: 1 },
  useParentLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0d4f38",
    marginBottom: 2,
  },
  useParentSub: { fontSize: 11, color: "#3d7a62" },

  // Form fields
  field:    { marginBottom: 14 },
  label:    { color: "#29466c", fontSize: 12, fontWeight: "700", marginBottom: 6 },
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
  selectText:  { color: "#1b2e49", flex: 1, fontSize: 14, marginRight: 10 },
  placeholder: { color: "#96a4b7", flex: 1, fontSize: 14, marginRight: 10 },
  dropdown: {
    backgroundColor: "#fff",
    borderColor: "#dfe7f0",
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 6,
    overflow: "hidden",
  },
  option: {
    borderBottomColor: "#f0f3f7",
    borderBottomWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  optionText: { color: "#1b2e49", fontSize: 13 },

  // Plus button
  plusButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#5041df",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },

  // Selectable item (bill / tenant)
  selectable: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4eaf2",
    marginBottom: 10,
    padding: 10,
    overflow: "hidden",
  },
  selectableChecked: {
    borderColor: "#99dfd1",
    backgroundColor: "#eefbf8",
  },

  // Checkbox
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#c4d0e0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },

  // Bill card inner
  billIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  billInfo:       { flex: 1, paddingLeft: 10 },
  billRow:        { flexDirection: "row", alignItems: "center" },
  billName:       { flex: 1, fontSize: 14, fontWeight: "700", color: "#0d162a" },
  billAmount:     { fontSize: 13, fontWeight: "700", color: "#0d162a", marginLeft: 6 },
  billSub:        { fontSize: 12, color: "#526986", marginTop: 2 },
  billBadges:     { flexDirection: "row", marginTop: 5 },
  parentBillBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: "100%",
  },
  parentBillBadgeText: {
    color: "#4F46E5",
    fontSize: 10,
    fontWeight: "700",
    flexShrink: 1,
  },
  subMeterToggle: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingVertical: 2,
  },
  subMeterToggleSelected: { backgroundColor: "#D1FAE5", borderRadius: 10, paddingHorizontal: 7 },
  subMeterToggleText: { color: "#64748B", fontSize: 11, fontWeight: "600" },
  subMeterToggleTextSelected: { color: "#0F766E" },
  billFooter:     { flexDirection: "row", alignItems: "center", marginTop: 4 },
  billFooterText: { flex: 1, fontSize: 10, color: "#8b9bb0" },
  duePill:        { backgroundColor: "#eff6ff", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  duePillText:    { fontSize: 9, fontWeight: "600", color: "#2563eb" },

  // Tenant card inner
  tenantAvatar: { width: 48, height: 48, borderRadius: 15, flexShrink: 0 },
  tenantAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#6548ee",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tenantAvatarText:  { color: "#fff", fontSize: 14, fontWeight: "800" },
  tenantInfo:        { flex: 1, paddingLeft: 10 },
  tenantName:        { fontSize: 14, fontWeight: "700", color: "#0d162a", marginBottom: 4 },
  tenantMeta:        { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 },
  tenantStatusPill:  { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  tenantStatusText:  { fontSize: 10, fontWeight: "700" },
  tenantPhone:       { fontSize: 12, color: "#526986" },
  tenantEmail:       { fontSize: 11, color: "#8495aa" },

  // Info button
  infoBtn: { paddingLeft: 8, flexShrink: 0 },

  // Photos
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  photoTile: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#e9eef5",
  },
  photoTileImage: { height: "100%", width: "100%" },
  photoCoverBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    backgroundColor: "rgba(13,22,42,0.72)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  photoCoverText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  photoRemove: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(13,22,42,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: 96,
    height: 96,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#b9c2f0",
    backgroundColor: "#f3f4ff",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoAddText: { color: "#5041df", fontSize: 11, fontWeight: "700" },
  photoHint: { color: "#637b99", fontSize: 12, lineHeight: 17 },

  // Empty state
  emptyState:    { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle:    { fontSize: 16, fontWeight: "700", color: "#0d162a", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: "#637b99", textAlign: "center" },

  // Summary
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e4eaf2",
    padding: 16,
    marginBottom: 16,
  },
  summarySection:      { paddingVertical: 4 },
  summarySectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5041df",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryRow:    { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  summaryLabel:  { fontSize: 13, color: "#637b99", flex: 1 },
  summaryValue:  { fontSize: 13, fontWeight: "600", color: "#0d162a", flex: 2, textAlign: "right" },
  summaryDivider:{ height: 1, backgroundColor: "#eef1f6", marginVertical: 10 },
  summaryNone:   { fontSize: 13, color: "#8b9bb0", fontStyle: "italic" },
  summaryPhotos: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  summaryPhoto:  { width: 64, height: 64, borderRadius: 12 },

  // Save / delete
  saveBtn:      { backgroundColor: "#5041df", borderRadius: 15, paddingVertical: 14, alignItems: "center", marginBottom: 10 },
  disabled:     { opacity: 0.6 },
  saveBtnText:  { color: "#fff", fontSize: 14, fontWeight: "800" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderColor: "#f0b5b5",
    borderRadius: 15,
    borderWidth: 1,
    paddingVertical: 12,
    marginTop: 4,
  },
  deleteBtnText: { color: "#cc4040", fontSize: 13, fontWeight: "800" },

  // Bottom nav
  nav: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: 16,
    gap: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e4eaf2",
  },
  navBtn:      { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
  navBack:     { borderWidth: 1, borderColor: "#dfe7f0", backgroundColor: "#f7f9fc" },
  navBackText: { color: "#334155", fontSize: 14, fontWeight: "700" },
  navNext:     { flex: 1, justifyContent: "center", backgroundColor: "#5041df" },
  navNextText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,10,24,0.72)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    alignItems: "center",
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0d162a",
    marginBottom: 4,
    textAlign: "center",
  },
  modalSub:    { fontSize: 13, color: "#637b99", marginBottom: 6 },
  modalAmount: { fontSize: 24, fontWeight: "800", color: "#5041df", marginBottom: 12 },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#eef1f6",
  },
  modalLabel: { fontSize: 13, color: "#637b99" },
  modalValue: { fontSize: 13, fontWeight: "600", color: "#0d162a" },
  modalClose: {
    marginTop: 20,
    backgroundColor: "#5041df",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  modalCloseText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Tenant modal extras
  tenantModalPhoto: { width: 80, height: 80, borderRadius: 24, marginBottom: 10 },
  tenantModalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#6548ee",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tenantModalAvatarText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  statusPill:     { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
});
