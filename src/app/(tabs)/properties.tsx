import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "../../../global.css";
import { resolvePhotoUri } from "../../lib/photoStorage";
import {
  deletePropertyRecord,
  getProperties,
  type Property,
} from "../../lib/properties";

const getPropertyAddress = (property: Property) =>
  [property.street, property.barangay, property.city, property.province]
    .filter(Boolean)
    .join(", ");

const TYPE_FILTERS = [
  { icon: "view-grid-outline", label: "All property" },
  { icon: "office-building-outline", label: "Building" },
  { icon: "door-open", label: "Unit" },
] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number]["label"];

export default function Properties() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TypeFilter>("All property");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadProperties = useCallback(async () => {
    setProperties(await getProperties());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProperties();
    }, [loadProperties]),
  );

  const parentById = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );

  const visibleProperties = useMemo(() => {
    const search = query.trim().toLowerCase();
    return properties.filter((property) => {
      if (filter === "Building" && property.type !== "Building") return false;
      if (filter === "Unit" && property.type !== "Unit") return false;
      if (!search) return true;
      const parent = property.parentBuildingId
        ? parentById.get(property.parentBuildingId)
        : undefined;
      return [
        property.name,
        property.type,
        property.street,
        property.barangay,
        property.city,
        property.province,
        property.country,
        parent?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [filter, properties, parentById, query]);

  const childCount = useCallback(
    (id: string) =>
      properties.filter(
        (property) =>
          property.type === "Unit" && property.parentBuildingId === id,
      ).length,
    [properties],
  );

  const buildings = properties.filter((p) => p.type === "Building").length;
  const units     = properties.filter((p) => p.type === "Unit").length;

  const displayedProperties = visibleProperties;

  const isSelectionMode = selectedIds.length > 0;
  const allDisplayedSelected =
    displayedProperties.length > 0 &&
    displayedProperties.every((property) => selectedIds.includes(property.id));

  const toggleSelection = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const requestDelete = (ids: string[]) => {
    if (!ids.length) return;

    // A building can only be removed once its units are gone or reassigned.
    const blocked = ids.filter((id) => childCount(id) > 0);
    if (blocked.length) {
      const names = blocked
        .map((id) => properties.find((property) => property.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      Alert.alert(
        "Building has units",
        `${names} still ${blocked.length === 1 ? "has" : "have"} linked units. Reassign or delete those units first.`,
      );
      return;
    }

    Alert.alert(
      ids.length === 1 ? "Delete property?" : "Delete properties?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            void (async () => {
              await Promise.all(ids.map((id) => deletePropertyRecord(id)));
              setSelectedIds([]);
              await loadProperties();
            })(),
        },
      ],
    );
  };

  const editSelected = () => {
    if (selectedIds.length !== 1) {
      Alert.alert(
        "Select one property",
        "Edit is available when exactly one property is selected.",
      );
      return;
    }
    router.push({
      pathname: "/properties-AddNewProperties",
      params: { id: selectedIds[0] },
    });
  };

  const renderCard = (
    property: Property,
    options: { parent?: Property; unitCount?: number },
  ) => (
    <PropertyCard
      key={property.id}
      onEdit={() =>
        router.push({
          pathname: "/properties-AddNewProperties",
          params: { id: property.id },
        })
      }
      onLongPress={() => {
        if (!isSelectionMode) setSelectedIds([property.id]);
      }}
      onOpenUnits={() =>
        router.push({
          pathname: "/property-inbox",
          params: { buildingId: property.id },
        })
      }
      onPress={() => {
        if (isSelectionMode) toggleSelection(property.id);
        else
          router.push({
            pathname: "/properties-summary",
            params: { id: property.id },
          });
      }}
      parent={options.parent}
      property={property}
      selected={selectedIds.includes(property.id)}
      unitCount={options.unitCount}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        {isSelectionMode ? (
          <View className="mb-[18px] flex-row items-center justify-between pt-[8px]">
            <View className="flex-row items-center">
              <Pressable
                accessibilityLabel="Exit selection mode"
                className="ml-[4px] h-[44px] w-[44px] items-center justify-center rounded-[22px]"
                onPress={() => setSelectedIds([])}
              >
                <Ionicons color="#334155" name="close" size={24} />
              </Pressable>
              <Text className="text-[18px] font-extrabold text-[#0f172a]">
                {selectedIds.length} selected
              </Text>
            </View>
            <View className="flex-row items-center">
              <Pressable
                accessibilityLabel="Edit selected property"
                className={`ml-[4px] h-[44px] w-[44px] items-center justify-center rounded-[22px] ${
                  selectedIds.length !== 1 ? "opacity-40" : ""
                }`}
                onPress={editSelected}
              >
                <Ionicons color="#2563eb" name="pencil-outline" size={22} />
              </Pressable>
              <Pressable
                accessibilityLabel="Select all displayed properties"
                className="ml-[4px] h-[44px] w-[44px] items-center justify-center rounded-[22px]"
                onPress={() =>
                  setSelectedIds(
                    allDisplayedSelected
                      ? []
                      : displayedProperties.map((property) => property.id),
                  )
                }
              >
                <Ionicons
                  color="#0f766e"
                  name={allDisplayedSelected ? "checkbox" : "checkbox-outline"}
                  size={23}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Delete selected properties"
                className="ml-[4px] h-[44px] w-[44px] items-center justify-center rounded-[22px]"
                onPress={() => requestDelete(selectedIds)}
              >
                <Ionicons color="#dc2626" name="trash-outline" size={23} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Real Estate Portfolio</Text>
              <Text style={styles.title}>Properties</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Add property"
                onPress={() => router.push("/properties-AddNewProperties")}
                style={styles.addButton}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Property</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Summary card ─────────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryLabel}>Real Estate Portfolio</Text>
            </View>
            <View style={styles.occupancyPill}>
              <Text style={styles.occupancyPillText}>
                {properties.length} Propert{properties.length === 1 ? "y" : "ies"}
              </Text>
            </View>
          </View>

          <View style={styles.summaryStats}>
            <SummaryStat
              icon="office-building-outline"
              label="Buildings"
              value={`${buildings}`}
            />
            <SummaryStat
              icon="door-open"
              label="Units"
              value={`${units}`}
            />
            <SummaryStat
              icon="home-city-outline"
              label="Total"
              value={`${properties.length}`}
            />
          </View>
        </View>

        {/* ── Search ───────────────────────────────────────────────────── */}
        <View className="mb-[15px] min-h-[38px] flex-row items-center rounded-[18px] border border-[#dfe7f0] bg-white px-[13px]">
          <Ionicons color="#7890ae" name="search-outline" size={20} />
          <TextInput
            className="ml-[9px] flex-1 py-[9px] text-[13px] text-[#1b2e49]"
            onChangeText={setQuery}
            placeholder="Search name, address, or type..."
            placeholderTextColor="#7890ae"
            value={query}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons color="#7890ae" name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>

        {/* ── Type filter ──────────────────────────────────────────────── */}
        <View className="mb-[15px] flex-row gap-[8px]">
          {TYPE_FILTERS.map(({ icon, label }) => {
            const active = filter === label;
            return (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(label)}
                className={`h-[34px] flex-1 flex-row items-center justify-center gap-[5px] rounded-[17px] border ${
                  active
                    ? "border-[#5041df] bg-[#5041df]"
                    : "border-[#dfe7f0] bg-white"
                }`}
              >
                <MaterialCommunityIcons
                  color={active ? "#FFFFFF" : "#4C45F5"}
                  name={icon}
                  size={15}
                />
                <Text
                  className={`text-[12px] font-bold ${
                    active ? "text-white" : "text-[#29466c]"
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Property cards ────────────────────────────────────────────── */}
        <View className="gap-[12px] pt-[3px]">
          {visibleProperties.map((property) =>
            renderCard(property, {
              parent: property.parentBuildingId
                ? parentById.get(property.parentBuildingId)
                : undefined,
              unitCount: childCount(property.id),
            }),
          )}

          {!displayedProperties.length ? (
            <View className="items-center py-[44px]">
              <MaterialCommunityIcons
                color="#9aa9bd"
                name={
                  filter === "Unit"
                    ? "door-open"
                    : "office-building-outline"
                }
                size={34}
              />
              <Text className="mt-[10px] text-[16px] font-extrabold text-[#1a2b44]">
                {!properties.length
                  ? "No properties yet"
                  : filter === "Unit"
                    ? "No units found"
                    : filter === "Building"
                      ? "No buildings found"
                      : "No properties found"}
              </Text>
              <Text className="mt-[4px] text-center text-[13px] text-[#7890ae]">
                {properties.length
                  ? "Try another search or filter."
                  : "Tap + Property to add your first one."}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.summaryStat}>
      <View style={styles.statLabelRow}>
        <MaterialCommunityIcons
          name={icon}
          size={13}
          color={accent ? "#FFD34E" : "#9FA9DE"}
        />
        <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>
          {label}
        </Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function PropertyCard({
  property,
  selected,
  parent,
  unitCount = 0,
  onPress,
  onLongPress,
  onEdit,
  onOpenUnits,
}: {
  property: Property;
  selected: boolean;
  parent?: Property;
  unitCount?: number;
  onPress: () => void;
  onLongPress: () => void;
  onEdit: () => void;
  onOpenUnits: () => void;
}) {
  const address = getPropertyAddress(property);
  const isUnit = property.type === "Unit";
  const cover = property.photos?.[0];
  const photoCount = property.photos?.length ?? 0;
  const parentCover = parent?.photos?.[0];

  // Unit cards point back at the building they belong to.
  const parentLabel = parent
    ? parent.name
    : property.parentBuildingId
      ? "Parent building removed"
      : "No parent building";

  return (
    <Pressable
      className={`rounded-[24px] border p-[16px] ${
        selected ? "border-[#99dfd1] bg-[#eefbf8]" : "border-[#e4eaf2] bg-white"
      }`}
      delayLongPress={300}
      onLongPress={onLongPress}
      onPress={onPress}
    >
      <View className="flex-row items-center">
        {selected ? (
          <View className="h-[48px] w-[48px] items-center justify-center rounded-[24px] bg-[#0f766e]">
            <Ionicons color="#fff" name="checkmark" size={18} />
          </View>
        ) : cover ? (
          <Image
            className="h-[48px] w-[48px] rounded-[15px]"
            source={{ uri: resolvePhotoUri(cover) ?? cover }}
          />
        ) : (
          <View
            className={`h-[48px] w-[48px] items-center justify-center rounded-[15px] ${
              isUnit ? "bg-[#0891b2]" : "bg-[#6548ee]"
            }`}
          >
            <MaterialCommunityIcons
              color="#fff"
              name={isUnit ? "door-open" : "office-building-outline"}
              size={22}
            />
          </View>
        )}
        <View className="ml-[12px] min-w-0 flex-1">
          <Text
            className="mb-[5px] text-[15px] font-extrabold text-[#101a2e]"
            numberOfLines={1}
          >
            {property.name}
          </Text>
          <View className="mb-[3px] flex-row items-center gap-[7px]">
            <View
              className={`rounded-[10px] px-[8px] py-[3px] ${
                isUnit ? "bg-[#E0F7FA]" : "bg-[#EBECFF]"
              }`}
            >
              <Text
                className={`text-[10px] font-extrabold ${
                  isUnit ? "text-[#0891B2]" : "text-[#4C45F5]"
                }`}
              >
                {property.type}
              </Text>
            </View>
          </View>
          <Text
            className="mb-[3px] text-[12px] text-[#526986]"
            numberOfLines={1}
          >
            {address || "No address added"}
          </Text>

          {isUnit ? (
            <View className="mb-[5px] flex-row items-center self-start rounded-[10px] bg-[#f4f7fb] py-[3px] pl-[4px] pr-[8px]">
              {parentCover ? (
                <Image
                  className="h-[16px] w-[16px] rounded-[5px]"
                  source={{
                    uri: resolvePhotoUri(parentCover) ?? parentCover,
                  }}
                />
              ) : (
                <View className="h-[16px] w-[16px] items-center justify-center rounded-[5px] bg-[#e3e9f2]">
                  <MaterialCommunityIcons
                    color="#7c8ba1"
                    name="office-building-outline"
                    size={11}
                  />
                </View>
              )}
              <Text
                className={`ml-[5px] flex-shrink text-[10px] font-bold ${
                  parent ? "text-[#526986]" : "text-[#b06a2c]"
                }`}
                numberOfLines={1}
              >
                {parentLabel}
              </Text>
            </View>
          ) : null}

          <Text className="text-[11px] text-[#8495aa]" numberOfLines={1}>
            {photoCount
              ? `${photoCount} photo${photoCount !== 1 ? "s" : ""}`
              : "No photos added"}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Edit property"
          className="ml-[7px] h-[34px] w-[34px] items-center justify-center rounded-[14px] bg-[#f1f5f9]"
          onPress={onEdit}
        >
          <Ionicons color="#22324a" name="create-outline" size={17} />
        </Pressable>
      </View>
      <View className="mt-[14px] flex-row items-center border-t border-t-[#edf1f6] pt-[12px]">
        <View className="flex-1 flex-row items-center gap-[5px]">
          <MaterialCommunityIcons
            color="#A86406"
            name="receipt-text-outline"
            size={15}
          />
          <Text
            className="flex-1 text-[11px] text-[#526986]"
            numberOfLines={1}
          >
            {property.billIds.length} Bill
            {property.billIds.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View className="flex-1 flex-row items-center gap-[5px]">
          <MaterialCommunityIcons
            color="#2F5688"
            name="account-outline"
            size={15}
          />
          <Text
            className="flex-1 text-[11px] text-[#526986]"
            numberOfLines={1}
          >
            {property.tenantIds.length} Tenant
            {property.tenantIds.length !== 1 ? "s" : ""}
          </Text>
        </View>
        {!isUnit ? (
          <Pressable
            accessibilityLabel={`View units of ${property.name}`}
            className={`flex-row items-center gap-[4px] rounded-[10px] px-[8px] py-[3px] ${
              unitCount ? "bg-[#E0F7FA]" : "bg-[#f1f5f9]"
            }`}
            hitSlop={4}
            onPress={onOpenUnits}
          >
            <MaterialCommunityIcons
              color={unitCount ? "#0891B2" : "#8495aa"}
              name="door-open"
              size={14}
            />
            <Text
              className={`text-[11px] font-extrabold ${
                unitCount ? "text-[#0891B2]" : "text-[#8495aa]"
              }`}
            >
              {unitCount} Unit{unitCount !== 1 ? "s" : ""}
            </Text>
          </Pressable>
        ) : null}
        <MaterialCommunityIcons color="#2F5688" name="chevron-right" size={18} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F9FC" },
  content:  { paddingHorizontal: 16, paddingBottom: 32 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 3,
    paddingBottom: 18,
  },
  eyebrow: { color: "#334B78", fontSize: 12, marginBottom: 3 },
  title:   { color: "#101735", fontSize: 25, fontWeight: "800", letterSpacing: -0.6 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  addButton: {
    height: 40,
    paddingHorizontal: 13,
    borderRadius: 21,
    backgroundColor: "#4C45F5",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    shadowColor: "#4C45F5",
    shadowOpacity: 0.25,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

  // Summary card
  summaryCard: {
    marginBottom: 22,
    padding: 20,
    paddingBottom: 18,
    borderRadius: 26,
    backgroundColor: "#11183F",
    overflow: "hidden",
    shadowColor: "#172051",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  summaryLabel: { color: "#B7BFE7", fontSize: 12, fontWeight: "600", lineHeight: 15 },
  occupancyPill: {
    backgroundColor: "#363D6A",
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: -2,
  },
  occupancyPillText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", lineHeight: 14 },
  summaryStats:  { flexDirection: "row", gap: 8 },
  summaryStat: {
    flex: 1,
    backgroundColor: "#202852",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel:    { color: "#B8C2E7", fontSize: 10, fontWeight: "600" },
  statLabelAccent: { color: "#FFE15F" },
  statValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", marginTop: 5 },
});
