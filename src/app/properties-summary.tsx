import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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

import {
  PropertySummaryRow,
  PropertySummarySection,
  PropertySummaryMeta,
  PropertySummaryTab,
} from "../features/properties/components/PropertySummaryParts";
import { usePropertySummary } from "../features/properties/hooks/usePropertySummary";
import { getPropertyAddress } from "../features/properties/logic/propertyRules";
import { getTenantName } from "../features/tenants/logic/tenantRules";
import { resolvePhotoUri } from "../services/photoStorage";
import { pluralize } from "../utils/text";

type Tab = "details" | "gallery";

export default function PropertySummaryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { property, summary } = usePropertySummary(id);
  const { photos, linkedBills, linkedTenants, parentBuilding } = summary;
  const [tab, setTab] = useState<Tab>("details");
  const [preview, setPreview] = useState<string | null>(null);

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
                <PropertySummaryMeta
                  icon="receipt-text-outline"
                  label={pluralize(linkedBills.length, "Bill")}
                />
                <PropertySummaryMeta
                  icon="account-outline"
                  label={pluralize(linkedTenants.length, "Tenant")}
                />
                <PropertySummaryMeta
                  icon="image-multiple-outline"
                  label={pluralize(photos.length, "Photo")}
                />
              </View>
            </View>

            <View style={styles.tabs}>
              <PropertySummaryTab
                active={tab === "details"}
                icon="document-text-outline"
                label="Details"
                onPress={() => setTab("details")}
              />
              <PropertySummaryTab
                active={tab === "gallery"}
                icon="images-outline"
                label={`Gallery${photos.length ? ` (${photos.length})` : ""}`}
                onPress={() => setTab("gallery")}
              />
            </View>

            {tab === "details" ? (
              <View style={styles.card}>
                <PropertySummarySection title="Property Information">
                  <PropertySummaryRow label="Name" value={property.name} />
                  <PropertySummaryRow label="Type" value={property.type} />
                  {property.type === "Unit" ? (
                    <PropertySummaryRow
                      label="Parent Building"
                      value={parentBuilding?.name ?? "—"}
                    />
                  ) : null}
                </PropertySummarySection>

                <View style={styles.divider} />

                <PropertySummarySection title="Address">
                  {property.street ? (
                    <PropertySummaryRow label="Address line 1" value={property.street} />
                  ) : null}
                  {property.street2 ? (
                    <PropertySummaryRow label="Address line 2" value={property.street2} />
                  ) : null}
                  {property.barangay ? (
                    <PropertySummaryRow label="Barangay" value={property.barangay} />
                  ) : null}
                  <PropertySummaryRow label="City" value={property.city || "—"} />
                  <PropertySummaryRow label="Province" value={property.province || "—"} />
                  {property.zipCode ? (
                    <PropertySummaryRow label="ZIP" value={property.zipCode} />
                  ) : null}
                  <PropertySummaryRow label="Country" value={property.country || "—"} />
                </PropertySummarySection>

                <View style={styles.divider} />

                <PropertySummarySection title={`Bills (${linkedBills.length})`}>
                  {linkedBills.length === 0 ? (
                    <Text style={styles.none}>No bills linked</Text>
                  ) : (
                    linkedBills.map((bill) => (
                      <PropertySummaryRow
                        key={bill.id}
                        label={bill.name}
                        value={bill.utilityType}
                      />
                    ))
                  )}
                </PropertySummarySection>

                <View style={styles.divider} />

                <PropertySummarySection title={`Tenants (${linkedTenants.length})`}>
                  {linkedTenants.length === 0 ? (
                    <Text style={styles.none}>No tenants linked</Text>
                  ) : (
                    linkedTenants.map((tenant) => (
                      <PropertySummaryRow
                        key={tenant.id}
                        label={getTenantName(tenant)}
                        value={tenant.tenantStatus}
                      />
                    ))
                  )}
                </PropertySummarySection>
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

  tabs: {
    backgroundColor: "#eef2f8",
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 14,
    marginTop: 16,
    padding: 4,
  },

  card: {
    backgroundColor: "#fff",
    borderColor: "#e4eaf2",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
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
