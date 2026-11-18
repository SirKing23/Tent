import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Property = {
  name: string;
  address: string;
  tenant: string;
  rent: string;
  bills: string;
  renewal: string;
};

const properties: Property[] = [
  { name: "Oakwood Apt #4B", address: "742 Oakwood Ave, Unit 4B", tenant: "Elena Rostova", rent: "₱2,450.00", bills: "2 Bills (1 due)", renewal: "Renews in 165d" },
  { name: "Harborview Condo", address: "118 Harborview Dr, Suite 902", tenant: "Marcus Chen", rent: "₱2,927.11", bills: "2 Bills", renewal: "Renews in 92d" },
  { name: "Pinecrest Townhome", address: "29 Pinecrest Lane, Unit 2", tenant: "Sofia Bennett", rent: "₱1,980.00", bills: "0 Bills", renewal: "Renews in 238d" },
];

const filters = ["All Properties", "Oakwood Apt #4B", "Harborview", "Pinecrest"];

export default function Properties() {
  const [selectedFilter, setSelectedFilter] = useState(filters[0]);
  const visibleProperties = useMemo(
    () => selectedFilter === filters[0] ? properties : properties.filter((property) => property.name.startsWith(selectedFilter)),
    [selectedFilter],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Real Estate Portfolio</Text>
            <Text style={styles.title}>Properties</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="Property tools" style={styles.toolButton}>
              <MaterialCommunityIcons name="wrench-outline" size={19} color="#101735" />
            </Pressable>
            <Pressable accessibilityLabel="Add property" style={styles.addButton}>
              <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Property</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View><Text style={styles.summaryLabel}>November 2026 Cash</Text><Text style={styles.summaryLabel}>Flow</Text></View>
            <View style={styles.occupancyPill}><Text style={styles.occupancyPillText}>3 Properties • 92%</Text><Text style={styles.occupancyPillText}>Occ.</Text></View>
          </View>
          <View style={styles.metricRow}>
            <View><Text style={styles.metricCaption}>NET MONTHLY CASH FLOW</Text><Text style={styles.cashFlow}>+₱5,377.11</Text></View>
            <View style={styles.occupancyMetric}><Text style={styles.metricCaption}>Occupancy Rate</Text><Text style={styles.occupancyValue}>92%</Text></View>
          </View>
          <View style={styles.incomeRow}><Text style={styles.incomeText}>+ Rent Income: ₱7,290.00</Text><Text style={styles.expenseText}>Bills/Exp: ₱1,912.89</Text></View>
          <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
          <View style={styles.summaryStats}>
            <SummaryStat icon="office-building-outline" label="Units" value="3 Managed" />
            <SummaryStat icon="clipboard-check-outline" label="Open Tasks" value="2 Active" accent />
            <SummaryStat icon="receipt-text-outline" label="Linked Bills" value="4 Bills" />
          </View>
        </View>

        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>MANAGED UNITS</Text><Pressable><Text style={styles.showAll}>Showing all</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((filter) => {
            const selected = selectedFilter === filter;
            return <Pressable key={filter} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSelectedFilter(filter)} style={[styles.filterChip, selected && styles.filterChipSelected]}><Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter}</Text></Pressable>;
          })}
        </ScrollView>
        <View style={styles.cards}>{visibleProperties.map((property) => <PropertyCard key={property.name} property={property} />)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryStat({ icon, label, value, accent = false }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; accent?: boolean }) {
  return <View style={styles.summaryStat}><View style={styles.statLabelRow}><MaterialCommunityIcons name={icon} size={13} color={accent ? "#FFD34E" : "#9FA9DE"} /><Text style={[styles.statLabel, accent && styles.statLabelAccent]}>{label}</Text></View><Text style={styles.statValue}>{value}</Text></View>;
}

function PropertyCard({ property }: { property: Property }) {
  return <View style={styles.propertyCard}>
    <View style={styles.propertyHeader}>
      <View style={styles.buildingIcon}><MaterialCommunityIcons name="office-building-outline" size={21} color="#4C45F5" /></View>
      <View style={styles.propertyTitleBlock}><Text style={styles.propertyName} numberOfLines={1}>{property.name}</Text><Text style={styles.propertyAddress} numberOfLines={1}>{property.address}</Text></View>
      <View style={styles.occupiedBadge}><View style={styles.occupiedDot} /><Text style={styles.occupiedText}>Occupied</Text></View>
    </View>
    <View style={styles.divider} />
    <View style={styles.tenantRow}><View style={styles.tenantInfo}><MaterialCommunityIcons name="account-outline" size={15} color="#7E8BAA" /><Text style={styles.tenantName}>{property.tenant}</Text></View><Text style={styles.renewal}>{property.renewal}</Text></View>
    <View style={styles.rentRow}><View><Text style={styles.rentLabel}>MONTHLY RENT</Text><Text style={styles.rentValue}>{property.rent}</Text></View><View style={styles.billAction}><MaterialCommunityIcons name="receipt-text-outline" size={14} color="#A86406" /><Text style={styles.billText}>{property.bills}</Text><MaterialCommunityIcons name="chevron-right" size={18} color="#2F5688" /></View></View>
  </View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F9FC" }, content: { paddingHorizontal: 5, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 3, paddingBottom: 18 }, eyebrow: { color: "#334B78", fontSize: 12, marginBottom: 3 }, title: { color: "#101735", fontSize: 25, fontWeight: "800", letterSpacing: -0.6 }, headerActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  toolButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DEE5F0" }, addButton: { height: 40, paddingHorizontal: 13, borderRadius: 21, backgroundColor: "#4C45F5", flexDirection: "row", alignItems: "center", gap: 5, shadowColor: "#4C45F5", shadowOpacity: 0.25, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, addButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  summaryCard: { marginBottom: 22, padding: 20, paddingBottom: 18, borderRadius: 26, backgroundColor: "#11183F", overflow: "hidden", shadowColor: "#172051", shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 6 }, summaryTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, summaryLabel: { color: "#B7BFE7", fontSize: 12, fontWeight: "600", lineHeight: 15 }, occupancyPill: { backgroundColor: "#363D6A", borderRadius: 17, paddingHorizontal: 12, paddingVertical: 7, marginTop: -2 }, occupancyPillText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", lineHeight: 14 }, metricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 7 }, metricCaption: { color: "#AAB4D9", fontSize: 10, fontWeight: "600", letterSpacing: 0.45 }, cashFlow: { color: "#5CE4B6", fontSize: 32, fontWeight: "800", letterSpacing: -1.2, marginTop: 3 }, occupancyMetric: { alignItems: "flex-end", paddingBottom: 3 }, occupancyValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginTop: 3 }, incomeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 13 }, incomeText: { color: "#45E2B1", fontSize: 11, fontWeight: "600" }, expenseText: { color: "#FFB5BC", fontSize: 11, fontWeight: "600" }, progressTrack: { height: 9, backgroundColor: "#5C2B4B", borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: "#A84073", overflow: "hidden" }, progressFill: { width: "80%", height: "100%", backgroundColor: "#55E3C1", borderRadius: 8 }, summaryStats: { flexDirection: "row", gap: 8, marginTop: 17 }, summaryStat: { flex: 1, backgroundColor: "#202852", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 9 }, statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 }, statLabel: { color: "#B8C2E7", fontSize: 10, fontWeight: "600" }, statLabelAccent: { color: "#FFE15F" }, statValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", marginTop: 5 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }, sectionTitle: { color: "#8091B1", fontSize: 12, fontWeight: "800", letterSpacing: 0.7 }, showAll: { color: "#3731E8", fontSize: 11, fontWeight: "700" }, filterRow: { gap: 8, paddingBottom: 22 }, filterChip: { height: 30, paddingHorizontal: 14, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DEE5F0" }, filterChipSelected: { backgroundColor: "#101735", borderColor: "#101735" }, filterText: { color: "#203253", fontSize: 12, fontWeight: "600" }, filterTextSelected: { color: "#FFFFFF" }, cards: { gap: 14 },
  propertyCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "#E0E7F1", shadowColor: "#BBC7D8", shadowOpacity: 0.11, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, propertyHeader: { flexDirection: "row", alignItems: "center" }, buildingIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#F0F1FF", alignItems: "center", justifyContent: "center" }, propertyTitleBlock: { flex: 1, marginLeft: 12, minWidth: 0 }, propertyName: { color: "#121A37", fontSize: 15, fontWeight: "800" }, propertyAddress: { color: "#71809D", fontSize: 11, marginTop: 4 }, occupiedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#EBFAF5", borderColor: "#A6E8D1", borderWidth: 1, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6, marginLeft: 8 }, occupiedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#14B87A", marginRight: 5 }, occupiedText: { color: "#09835B", fontSize: 10, fontWeight: "700" }, divider: { height: 1, backgroundColor: "#EEF1F6", marginVertical: 13 }, tenantRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, tenantInfo: { flexDirection: "row", alignItems: "center", gap: 6 }, tenantName: { color: "#445576", fontSize: 12 }, renewal: { color: "#7E8DAA", fontSize: 10, fontWeight: "600" }, rentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F7F9FC", borderRadius: 16, padding: 11, marginTop: 11 }, rentLabel: { color: "#8798B5", fontSize: 9, fontWeight: "700", letterSpacing: 0.6 }, rentValue: { color: "#111A38", fontSize: 16, fontWeight: "800", marginTop: 3 }, billAction: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F9EBD3", borderRadius: 18, paddingVertical: 7, paddingHorizontal: 9 }, billText: { color: "#A86406", fontSize: 10, fontWeight: "700" },
});
