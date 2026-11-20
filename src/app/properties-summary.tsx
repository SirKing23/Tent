import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  useCallback,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "../../global.css";
import { getBillingItems, type BillingItem } from "../lib/bills";
import { resolvePhotoUri } from "../lib/photoStorage";
import { getBuildings, getProperties, type Property } from "../lib/properties";
import { getTenants, type Tenant } from "../lib/tenants";

type Tab = "details" | "gallery";

const getTenantName = (tenant: Tenant) =>
  [tenant.firstName, tenant.middleName, tenant.lastName]
    .filter(Boolean)
    .join(" ");

const getPropertyAddress = (property: Property) =>
  [property.street, property.barangay, property.city, property.province]
    .filter(Boolean)
    .join(", ");

const plural = (count: number, word: string) =>
  `${count} ${word}${count !== 1 ? "s" : ""}`;

export default function PropertySummaryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [property, setProperty] = useState<Property | null>(null);
  const [bills, setBills] = useState<BillingItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Property[]>([]);
  const [tab, setTab] = useState<Tab>("details");
  const [preview, setPreview] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const [propertiesData, billsData, tenantsData, buildingsData] =
          await Promise.all([
            getProperties(),
            getBillingItems(),
            getTenants(),
            getBuildings(),
          ]);
        setProperty(propertiesData.find((item) => item.id === id) ?? null);
        setBills(billsData);
        setTenants(tenantsData);
        setBuildings(buildingsData);
      })();
    }, [id]),
  );

  const photos = property?.photos ?? [];
  const linkedBills = property
    ? bills.filter((bill) => property.billIds.includes(bill.id))
    : [];
  const linkedTenants = property
    ? tenants.filter((tenant) => property.tenantIds.includes(tenant.id))
    : [];
  const parentBuilding =
    property?.parentBuildingId
      ? buildings.find(
          (building) => building.id === property.parentBuildingId,
        )
      : undefined;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <Stack.Screen
        options={{ headerShown: true, title: property?.name ?? "Property" }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!property ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              color="#9aa9bd"
              name="office-building-outline"
              size={40}
            />
            <Text style={styles.emptyTitle}>Property not found</Text>
            <Text style={styles.emptySub}>
              It may have been deleted or is no longer available.
            </Text>
          </View>
        ) : (
          <>
            {photos[0] ? (
              <Image
                source={{ uri: resolvePhotoUri(photos[0]) ?? photos[0] }}
                style={styles.cover}
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <MaterialCommunityIcons
                  color="#8b9bb0"
                  name={
                    property.type === "Unit"
                      ? "door-open"
                      : "office-building-outline"
                  }
                  size={38}
                />
                <Text style={styles.coverPlaceholderText}>No cover photo</Text>
              </View>
            )}

            <View style={styles.identity}>
              <View style={styles.identityRow}>
                <Text numberOfLines={2} style={styles.identityName}>
                  {property.name}
                </Text>
                <View
                  style={[
                    styles.typePill,
                    property.type === "Unit"
                      ? styles.typePillUnit
                      : styles.typePillBuilding,
                  ]}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      property.type === "Unit"
                        ? styles.typePillTextUnit
                        : styles.typePillTextBuilding,
                    ]}
                  >
                    {property.type}
                  </Text>
                </View>
              </View>
              <Text style={styles.identityAddress}>
                {getPropertyAddress(property) || "No address added"}
              </Text>
              <View style={styles.identityStats}>
                <Stat
                  icon="receipt-text-outline"
                  label={plural(linkedBills.length, "Bill")}
                />
                <Stat
                  icon="account-outline"
                  label={plural(linkedTenants.length, "Tenant")}
                />
                <Stat
                  icon="image-multiple-outline"
                  label={plural(photos.length, "Photo")}
                />
              </View>
            </View>

            <View style={styles.tabs}>
              <TabButton
                active={tab === "details"}
                icon="document-text-outline"
                label="Details"
                onPress={() => setTab("details")}
              />
              <TabButton
                active={tab === "gallery"}
                icon="images-outline"
                label={`Gallery${photos.length ? ` (${photos.length})` : ""}`}
                onPress={() => setTab("gallery")}
              />
            </View>

            {tab === "details" ? (
              <View style={styles.card}>
                <Section title="Property Information">
                  <Row label="Name" value={property.name} />
                  <Row label="Type" value={property.type} />
                  {property.type === "Unit" ? (
                    <Row
                      label="Parent Building"
                      value={parentBuilding?.name ?? "—"}
                    />
                  ) : null}
                </Section>

                <View style={styles.divider} />

                <Section title="Address">
                  <Row label="Street" value={property.street || "—"} />
                  {property.barangay ? (
                    <Row label="Barangay" value={property.barangay} />
                  ) : null}
                  <Row label="City" value={property.city || "—"} />
                  <Row label="Province" value={property.province || "—"} />
                  {property.zipCode ? (
                    <Row label="ZIP" value={property.zipCode} />
                  ) : null}
                  <Row label="Country" value={property.country || "—"} />
                </Section>

                <View style={styles.divider} />

                <Section title={`Bills (${linkedBills.length})`}>
                  {linkedBills.length === 0 ? (
                    <Text style={styles.none}>No bills linked</Text>
                  ) : (
                    linkedBills.map((bill) => (
                      <Row
                        key={bill.id}
                        label={bill.name}
                        value={bill.utilityType}
                      />
                    ))
                  )}
                </Section>

                <View style={styles.divider} />

                <Section title={`Tenants (${linkedTenants.length})`}>
                  {linkedTenants.length === 0 ? (
                    <Text style={styles.none}>No tenants linked</Text>
                  ) : (
                    linkedTenants.map((tenant) => (
                      <Row
                        key={tenant.id}
                        label={getTenantName(tenant)}
                        value={tenant.tenantStatus}
                      />
                    ))
                  )}
                </Section>
              </View>
            ) : photos.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons color="#9aa9bd" name="images-outline" size={34} />
                <Text style={styles.emptyTitle}>No photos yet</Text>
                <Text style={styles.emptySub}>
                  Photos added to this property will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.gallery}>
                {photos.map((photo, index) => {
                  const uri = resolvePhotoUri(photo) ?? photo;
                  return (
                    <Pressable
                      key={`${photo}-${index}`}
                      accessibilityLabel={`View photo ${index + 1}`}
                      onPress={() => setPreview(uri)}
                      style={styles.galleryTile}
                    >
                      <Image source={{ uri }} style={styles.galleryImage} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setPreview(null)}
        transparent
        visible={Boolean(preview)}
      >
        <View style={styles.previewOverlay}>
          <Pressable
            accessibilityLabel="Close photo preview"
            onPress={() => setPreview(null)}
            style={styles.previewClose}
          >
            <Ionicons color="#fff" name="close" size={25} />
          </Pressable>
          {preview ? (
            <Image
              resizeMode="contain"
              source={{ uri: preview }}
              style={styles.previewImage}
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({
  icon,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons color="#8b9bb0" name={icon} size={15} />
      <Text numberOfLines={1} style={styles.statText}>
        {label}
      </Text>
    </View>
  );
}

function TabButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Ionicons
        color={active ? "#fff" : "#526986"}
        name={icon}
        size={16}
      />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: "#f7f9fc", flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  cover: { borderRadius: 22, height: 180, width: "100%" },
  coverPlaceholder: {
    alignItems: "center",
    backgroundColor: "#eef2f8",
    borderColor: "#dde5f0",
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    height: 180,
    justifyContent: "center",
  },
  coverPlaceholderText: { color: "#8b9bb0", fontSize: 12 },

  identity: {
    backgroundColor: "#fff",
    borderColor: "#e4eaf2",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: -26,
    padding: 16,
    shadowColor: "#bbc7d8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 9,
    elevation: 3,
  },
  identityRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  identityName: {
    color: "#0d162a",
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
  },
  typePill: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  typePillBuilding: { backgroundColor: "#EBECFF" },
  typePillUnit: { backgroundColor: "#E0F7FA" },
  typePillText: { fontSize: 10, fontWeight: "800" },
  typePillTextBuilding: { color: "#4C45F5" },
  typePillTextUnit: { color: "#0891B2" },
  identityAddress: { color: "#637b99", fontSize: 12, marginTop: 6 },

  identityStats: {
    borderTopColor: "#edf1f6",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
  },
  stat: { alignItems: "center", flex: 1, flexDirection: "row", gap: 5 },
  statText: { color: "#526986", flex: 1, fontSize: 11, fontWeight: "600" },

  tabs: {
    backgroundColor: "#eef2f8",
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 14,
    marginTop: 16,
    padding: 4,
  },
  tab: {
    alignItems: "center",
    borderRadius: 13,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 9,
  },
  tabActive: { backgroundColor: "#5041df" },
  tabText: { color: "#526986", fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: "#fff" },

  card: {
    backgroundColor: "#fff",
    borderColor: "#e4eaf2",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  section: { paddingVertical: 4 },
  sectionTitle: {
    color: "#5041df",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  rowLabel: { color: "#637b99", flex: 1, fontSize: 13 },
  rowValue: {
    color: "#0d162a",
    flex: 2,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  divider: { backgroundColor: "#eef1f6", height: 1, marginVertical: 10 },
  none: { color: "#8b9bb0", fontSize: 13, fontStyle: "italic" },

  gallery: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  galleryTile: {
    aspectRatio: 1,
    backgroundColor: "#e9eef5",
    borderRadius: 16,
    overflow: "hidden",
    width: "31%",
  },
  galleryImage: { height: "100%", width: "100%" },

  emptyState: { alignItems: "center", paddingVertical: 44 },
  emptyTitle: {
    color: "#1a2b44",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
  emptySub: {
    color: "#7890ae",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },

  previewOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(4,10,24,0.96)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  previewClose: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    top: 52,
    width: 44,
    zIndex: 10,
  },
  previewImage: { height: "80%", width: "100%" },
});
