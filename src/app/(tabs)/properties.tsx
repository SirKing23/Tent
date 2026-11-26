import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "../../../global.css";
import { PropertyListCard } from "../../features/properties/components/PropertyListCard";
import { PropertySummaryStat } from "../../features/properties/components/PropertySummaryStat";
import { useProperties } from "../../features/properties/hooks/useProperties";
import {
  countChildUnits,
  countPropertiesByType,
  filterProperties,
  partitionPropertyIdsByChildUnits,
} from "../../features/properties/logic/propertyRules";
import type { Property } from "../../features/properties/types";
import { useSelection } from "../../hooks/useSelection";

const TYPE_FILTERS = [
  { icon: "view-grid-outline", label: "All property" },
  { icon: "office-building-outline", label: "Building" },
  { icon: "door-open", label: "Unit" },
] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number]["label"];

export default function Properties() {
  const router = useRouter();
  const { properties, remove: removeProperties } = useProperties();
  const selection = useSelection();
  const { selectedIds } = selection;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TypeFilter>("All property");

  const parentById = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );

  const visibleProperties = useMemo(
    () =>
      filterProperties(properties, {
        query,
        type: filter === "All property" ? "all" : filter,
      }),
    [filter, properties, query],
  );

  const childCount = (id: string) => countChildUnits(properties, id);

  const { buildings, units } = countPropertiesByType(properties);

  const displayedProperties = visibleProperties;

  const isSelectionMode = selection.isSelectionMode;
  const allDisplayedSelected =
    displayedProperties.length > 0 &&
    displayedProperties.every((property) => selectedIds.includes(property.id));

  const toggleSelection = selection.toggle;

  const requestDelete = (ids: string[]) => {
    if (!ids.length) return;

    // A building can only be removed once its units are gone or reassigned.
    const { blocked } = partitionPropertyIdsByChildUnits(properties, ids);
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
              await removeProperties(ids);
              selection.clear();
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
    <PropertyListCard
      key={property.id}
      onEdit={() =>
        router.push({
          pathname: "/properties-AddNewProperties",
          params: { id: property.id },
        })
      }
      onLongPress={() => {
        if (!isSelectionMode) selection.selectOnly(property.id);
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
                onPress={() => selection.clear()}
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
                  selection.replace(
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
             <Text className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#637b99]">Real Estate Portfolio</Text>
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
            <PropertySummaryStat
              icon="office-building-outline"
              label="Buildings"
              value={`${buildings}`}
            />
            <PropertySummaryStat
              icon="door-open"
              label="Units"
              value={`${units}`}
            />
            <PropertySummaryStat
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
});
