import Ionicons from "@react-native-vector-icons/ionicons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteTenantRecord, getTenants, type Tenant } from "../lib/tenants";

export default function TenantsInboxScreen() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ uri: string; label: string } | null>(
    null,
  );
  const loadTenants = useCallback(
    async () => setTenants(await getTenants()),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      void loadTenants();
    }, [loadTenants]),
  );
  const visibleTenants = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return tenants;
    return tenants.filter((tenant) =>
      [getTenantName(tenant), tenant.phone, tenant.email]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [query, tenants]);
  const count = (status: Tenant["tenantStatus"]) =>
    tenants.filter((tenant) => tenant.tenantStatus === status).length;
  const isSelectionMode = selectedIds.length > 0;
  const allDisplayedSelected =
    visibleTenants.length > 0 &&
    visibleTenants.every((tenant) => selectedIds.includes(tenant.id));
  const toggleSelection = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const requestDelete = (ids: string[]) => {
    if (!ids.length) return;
    Alert.alert(
      ids.length === 1 ? "Delete tenant?" : "Delete tenants?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            void (async () => {
              await Promise.all(ids.map((id) => deleteTenantRecord(id)));
              setSelectedIds([]);
              await loadTenants();
            })(),
        },
      ],
    );
  };
  const editSelected = () => {
    if (selectedIds.length !== 1) {
      Alert.alert(
        "Select one tenant",
        "Edit is available when exactly one tenant is selected.",
      );
      return;
    }
    router.push({
      pathname: "/tenants-AddNewTenants",
      params: { id: selectedIds[0] },
    });
  };

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50"
      edges={["bottom"]}
      style={styles.safe}
    >
      <Stack.Screen options={{ headerShown: true, title: "Manage" }} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isSelectionMode ? (
          <View style={styles.selectionHeader}>
            <View style={styles.selectionLeft}>
              <Pressable
                accessibilityLabel="Exit selection mode"
                onPress={() => setSelectedIds([])}
                style={styles.headerIcon}
              >
                <Ionicons color="#334155" name="close" size={24} />
              </Pressable>
              <Text style={styles.selectedText}>
                {selectedIds.length} selected
              </Text>
            </View>
            <View style={styles.selectionActions}>
              <Pressable
                accessibilityLabel="Edit selected tenant"
                onPress={editSelected}
                style={[
                  styles.headerIcon,
                  selectedIds.length !== 1 && styles.disabledIcon,
                ]}
              >
                <Ionicons color="#2563eb" name="pencil-outline" size={22} />
              </Pressable>
              <Pressable
                accessibilityLabel="Select all displayed tenants"
                onPress={() =>
                  setSelectedIds(
                    allDisplayedSelected
                      ? []
                      : visibleTenants.map((tenant) => tenant.id),
                  )
                }
                style={styles.headerIcon}
              >
                <Ionicons
                  color="#0f766e"
                  name={allDisplayedSelected ? "checkbox" : "checkbox-outline"}
                  size={23}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Delete selected tenants"
                onPress={() => requestDelete(selectedIds)}
                style={styles.headerIcon}
              >
                <Ionicons color="#dc2626" name="trash-outline" size={23} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Resident Directory</Text>
              <Text style={styles.title}>Tenants</Text>
            </View>
            <Pressable
              className="flex-row items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3"
              onPress={() => router.push("/tenants-AddNewTenants")}
              style={styles.newButton}
            >
              <Ionicons color="#fff" name="person-add-outline" size={17} />
              <Text
                className="text-sm font-bold text-white"
                style={styles.newText}
              >
                New Tenant
              </Text>
            </Pressable>
          </View>
        )}
        
        <View style={styles.summary}>
          <Summary label="Active" value={count("Active")} color="#009a61" />
          <Summary label="Inactive" value={count("Inactive")} color="#d96a00" />
          <Summary label="Reserved" value={count("Reserved")} color="#5146e5" />
        </View>
        <View style={styles.search}>
          <Ionicons color="#7890ae" name="search-outline" size={20} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search name, phone, or email..."
            placeholderTextColor="#7890ae"
            style={styles.input}
            value={query}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons color="#7890ae" name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.list}>
          {visibleTenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              onEdit={() =>
                router.push({
                  pathname: "/tenants-AddNewTenants",
                  params: { id: tenant.id },
                })
              }
              onLongPress={() => {
                if (!isSelectionMode) setSelectedIds([tenant.id]);
              }}
              onPreview={(uri, label) => setPreview({ uri, label })}
              onPress={() => {
                if (isSelectionMode) toggleSelection(tenant.id);
                else
                  router.push({
                    pathname: "/tenants-AddNewTenants",
                    params: { id: tenant.id },
                  });
              }}
              selected={selectedIds.includes(tenant.id)}
              tenant={tenant}
            />
          ))}
          {!visibleTenants.length ? (
            <View style={styles.empty}>
              <Ionicons color="#9aa9bd" name="people-outline" size={30} />
              <Text style={styles.emptyTitle}>No tenants found</Text>
              <Text style={styles.emptyText}>
                {tenants.length
                  ? "Try another search."
                  : "Create your first tenant to get started."}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <ImagePreview image={preview} onClose={() => setPreview(null)} />
    </SafeAreaView>
  );
}

function Summary({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}
function getTenantName(tenant: Tenant) {
  return [tenant.firstName, tenant.middleName, tenant.lastName]
    .filter(Boolean)
    .join(" ");
}

function TenantCard({
  tenant,
  onEdit,
  onPress,
  onLongPress,
  onPreview,
  selected,
}: {
  tenant: Tenant;
  onEdit: () => void;
  onPress: () => void;
  onLongPress: () => void;
  onPreview: (uri: string, label: string) => void;
  selected: boolean;
}) {
  const statusStyle =
    tenant.tenantStatus === "Active"
      ? styles.activeBadge
      : tenant.tenantStatus === "Inactive"
        ? styles.inactiveBadge
        : styles.reservedBadge;
  const statusTextStyle =
    tenant.tenantStatus === "Active"
      ? styles.activeBadgeText
      : tenant.tenantStatus === "Inactive"
        ? styles.inactiveBadgeText
        : styles.reservedBadgeText;
  return (
    <Pressable
      delayLongPress={300}
      onLongPress={onLongPress}
      onPress={onPress}
      style={[styles.card, selected && styles.selectedCard]}
    >
      <View style={styles.cardTop}>
        {selected ? (
          <View style={styles.selectedMark}>
            <Ionicons color="#fff" name="checkmark" size={18} />
          </View>
        ) : tenant.photo ? (
          <Pressable
            onPress={() => onPreview(tenant.photo as string, "Tenant photo")}
          >
            <Image source={{ uri: tenant.photo }} style={styles.avatarImage} />
          </Pressable>
        ) : (
          <View style={styles.avatar}>
            <Text
              style={styles.avatarText}
            >{`${tenant.firstName[0] ?? ""}${tenant.lastName[0] ?? ""}`}</Text>
          </View>
        )}
        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>
            {getTenantName(tenant)}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, statusStyle]}>
              <Text style={[styles.statusBadgeText, statusTextStyle]}>
                {tenant.tenantStatus}
              </Text>
            </View>
          </View>
          <Text style={styles.phone}>{tenant.phone}</Text>
          <Text numberOfLines={1} style={styles.email}>
            {tenant.email || "No email added"}
          </Text>
        </View>
        <Pressable onPress={onEdit} style={styles.edit}>
          <Ionicons color="#22324a" name="create-outline" size={17} />
        </Pressable>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.idStatus}>
          <Ionicons color="#009a61" name="shield-checkmark-outline" size={15} />
          <Text numberOfLines={1} style={styles.idStatusText}>
            {tenant.idType} · {tenant.idNumber}
          </Text>
        </View>
        {tenant.idPhoto ? (
          <Pressable
            accessibilityLabel="View ID photo"
            onPress={() => onPreview(tenant.idPhoto as string, "ID photo")}
            style={styles.viewImage}
          >
            <Ionicons color="#5146e5" name="eye-outline" size={17} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function ImagePreview({
  image,
  onClose,
}: {
  image: { uri: string; label: string } | null;
  onClose: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={Boolean(image)}
    >
      <View style={styles.previewModal}>
        <Pressable
          accessibilityLabel="Close image preview"
          onPress={onClose}
          style={styles.previewClose}
        >
          <Ionicons color="#fff" name="close" size={25} />
        </Pressable>
        {image ? (
          <Image
            accessibilityLabel={image.label}
            resizeMode="contain"
            source={{ uri: image.uri }}
            style={styles.previewImage}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  selectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingTop: 8,
  },
  selectionLeft: { alignItems: "center", flexDirection: "row" },
  selectionActions: { alignItems: "center", flexDirection: "row" },
  headerIcon: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    marginLeft: 4,
    width: 44,
  },
  disabledIcon: { opacity: 0.4 },
  selectedText: { color: "#0f172a", fontSize: 18, fontWeight: "800" },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginBottom: 3,
  },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  activeBadge: { backgroundColor: "#e3f8f0" },
  activeBadgeText: { color: "#009a61" },
  inactiveBadge: { backgroundColor: "#fff1dd" },
  inactiveBadgeText: { color: "#d96a00" },
  reservedBadge: { backgroundColor: "#eef0ff" },
  reservedBadgeText: { color: "#5146e5" },
  safe: { backgroundColor: "#f7f9fc", flex: 1 },
  content: { paddingBottom: 28, paddingHorizontal: 16 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 22,
    paddingTop: 11,
  },
  eyebrow: { color: "#29466c", fontSize: 13, marginBottom: 3 },
  title: { color: "#0d162a", fontSize: 26, fontWeight: "800" },
  newButton: {
    alignItems: "center",
    backgroundColor: "#5041df",
    borderRadius: 20,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  newText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  summary: { flexDirection: "row", gap: 10, marginBottom: 20 },
  summaryCard: {
    backgroundColor: "#fff",
    borderColor: "#e4eaf2",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 83,
    paddingHorizontal: 13,
    paddingVertical: 18,
  },
  summaryLabel: { color: "#526986", fontSize: 12, marginBottom: 8 },
  summaryValue: { fontSize: 21, fontWeight: "800" },
  search: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#dfe7f0",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 38,
    paddingHorizontal: 13,
  },
  input: {
    color: "#1b2e49",
    flex: 1,
    fontSize: 13,
    marginLeft: 9,
    paddingVertical: 9,
  },
  list: { gap: 12, paddingTop: 15 },
  card: {
    backgroundColor: "#fff",
    borderColor: "#e4eaf2",
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  selectedCard: { backgroundColor: "#eefbf8", borderColor: "#99dfd1" },
  selectedMark: {
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  cardTop: { alignItems: "center", flexDirection: "row" },
  avatar: {
    alignItems: "center",
    backgroundColor: "#6548ee",
    borderRadius: 15,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarImage: { borderRadius: 15, height: 48, width: 48 },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  identity: { flex: 1, marginLeft: 12, minWidth: 0 },
  name: { color: "#101a2e", fontSize: 15, fontWeight: "800", marginBottom: 5 },
  phone: { color: "#526986", fontSize: 12, marginBottom: 3 },
  email: { color: "#8495aa", fontSize: 11 },
  edit: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    marginLeft: 7,
    width: 34,
  },
  cardFooter: {
    alignItems: "center",
    borderTopColor: "#edf1f6",
    borderTopWidth: 1,
    flexDirection: "row",
    marginTop: 14,
    paddingTop: 12,
  },
  idStatus: { alignItems: "center", flex: 1, flexDirection: "row", gap: 5 },
  idStatusText: { color: "#526986", flex: 1, fontSize: 11 },
  viewImage: {
    alignItems: "center",
    backgroundColor: "#eef0ff",
    borderRadius: 14,
    height: 30,
    justifyContent: "center",
    marginLeft: 8,
    width: 30,
  },
  empty: { alignItems: "center", paddingVertical: 44 },
  emptyTitle: {
    color: "#1a2b44",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
  emptyText: { color: "#7890ae", fontSize: 13, marginTop: 4 },
  previewModal: {
    alignItems: "center",
    backgroundColor: "rgba(4, 10, 24, 0.96)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  previewImage: { height: "80%", width: "100%" },
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
    zIndex: 1,
  },
});
