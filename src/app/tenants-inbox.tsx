import Ionicons from "@react-native-vector-icons/ionicons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
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
    <SafeAreaView className="flex-1 bg-[#f7f9fc]" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "Manage" }} />
      <View className="bg-[#f7f9fc] px-[16px] pb-[15px]">
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
                accessibilityLabel="Edit selected tenant"
                className={`ml-[4px] h-[44px] w-[44px] items-center justify-center rounded-[22px] ${
                  selectedIds.length !== 1 ? "opacity-40" : ""
                }`}
                onPress={editSelected}
              >
                <Ionicons color="#2563eb" name="pencil-outline" size={22} />
              </Pressable>
              <Pressable
                accessibilityLabel="Select all displayed tenants"
                className="ml-[4px] h-[44px] w-[44px] items-center justify-center rounded-[22px]"
                onPress={() =>
                  setSelectedIds(
                    allDisplayedSelected
                      ? []
                      : visibleTenants.map((tenant) => tenant.id),
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
                accessibilityLabel="Delete selected tenants"
                className="ml-[4px] h-[44px] w-[44px] items-center justify-center rounded-[22px]"
                onPress={() => requestDelete(selectedIds)}
              >
                <Ionicons color="#dc2626" name="trash-outline" size={23} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center justify-between pb-[22px] pt-[11px]">
            <View>
              <Text className="mb-[3px] text-[13px] text-[#29466c]">
                Resident Directory
              </Text>
              <Text className="text-[26px] font-extrabold text-[#0d162a]">
                Tenants
              </Text>
            </View>
            <Pressable
              className="flex-row items-center gap-[7px] rounded-[20px] bg-[#5041df] px-[15px] py-[12px]"
              onPress={() => router.push("/tenants-AddNewTenants")}
            >
              <Ionicons color="#fff" name="person-add-outline" size={17} />
              <Text className="text-[14px] font-bold text-white">
                New Tenant
              </Text>
            </Pressable>
          </View>
        )}

        <View className="mb-[20px] flex-row gap-[10px]">
          <Summary
            label="Active"
            value={count("Active")}
            colorClass="text-[#009a61]"
          />
          <Summary
            label="Inactive"
            value={count("Inactive")}
            colorClass="text-[#d96a00]"
          />
          <Summary
            label="Reserved"
            value={count("Reserved")}
            colorClass="text-[#5146e5]"
          />
        </View>
        <View className="min-h-[38px] flex-row items-center rounded-[18px] border border-[#dfe7f0] bg-white px-[13px]">
          <Ionicons color="#7890ae" name="search-outline" size={20} />
          <TextInput
            className="ml-[9px] flex-1 py-[9px] text-[13px] text-[#1b2e49]"
            onChangeText={setQuery}
            placeholder="Search name, phone, or email..."
            placeholderTextColor="#7890ae"
            value={query}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons color="#7890ae" name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>
        </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-[16px] pb-[28px]"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
       
        <View className="gap-[12px] pt-[15px]">
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
            <View className="items-center py-[44px]">
              <Ionicons color="#9aa9bd" name="people-outline" size={30} />
              <Text className="mt-[10px] text-[16px] font-extrabold text-[#1a2b44]">
                No tenants found
              </Text>
              <Text className="mt-[4px] text-[13px] text-[#7890ae]">
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
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <View className="min-h-[83px] flex-1 rounded-[16px] border border-[#e4eaf2] bg-white px-[13px] py-[18px]">
      <Text className="mb-[8px] text-[12px] text-[#526986]">{label}</Text>
      <Text className={`text-[21px] font-extrabold ${colorClass}`}>
        {value}
      </Text>
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
  const statusClass =
    tenant.tenantStatus === "Active"
      ? "bg-[#e3f8f0]"
      : tenant.tenantStatus === "Inactive"
        ? "bg-[#fff1dd]"
        : "bg-[#eef0ff]";
  const statusTextClass =
    tenant.tenantStatus === "Active"
      ? "text-[#009a61]"
      : tenant.tenantStatus === "Inactive"
        ? "text-[#d96a00]"
        : "text-[#5146e5]";
  return (
    <Pressable
      className={`rounded-[24px] border p-[16px] ${
        selected
          ? "border-[#99dfd1] bg-[#eefbf8]"
          : "border-[#e4eaf2] bg-white"
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
        ) : tenant.photo ? (
          <Pressable
            onPress={() => onPreview(tenant.photo as string, "Tenant photo")}
          >
            <Image
              className="h-[48px] w-[48px] rounded-[15px]"
              source={{ uri: tenant.photo }}
            />
          </Pressable>
        ) : (
          <View className="h-[48px] w-[48px] items-center justify-center rounded-[15px] bg-[#6548ee]">
            <Text className="text-[15px] font-extrabold text-white">{`${tenant.firstName[0] ?? ""}${tenant.lastName[0] ?? ""}`}</Text>
          </View>
        )}
        <View className="ml-[12px] min-w-0 flex-1">
          <Text
            className="mb-[5px] text-[15px] font-extrabold text-[#101a2e]"
            numberOfLines={1}
          >
            {getTenantName(tenant)}
          </Text>
          <View className="mb-[3px] flex-row items-center gap-[7px]">
            <View className={`rounded-[10px] px-[8px] py-[3px] ${statusClass}`}>
              <Text
                className={`text-[10px] font-extrabold ${statusTextClass}`}
              >
                {tenant.tenantStatus}
              </Text>
            </View>
          </View>
          <Text className="mb-[3px] text-[12px] text-[#526986]">
            {tenant.phone}
          </Text>
          <Text className="text-[11px] text-[#8495aa]" numberOfLines={1}>
            {tenant.email || "No email added"}
          </Text>
        </View>
        <Pressable
          className="ml-[7px] h-[34px] w-[34px] items-center justify-center rounded-[14px] bg-[#f1f5f9]"
          onPress={onEdit}
        >
          <Ionicons color="#22324a" name="create-outline" size={17} />
        </Pressable>
      </View>
      <View className="mt-[14px] flex-row items-center border-t border-t-[#edf1f6] pt-[12px]">
        <View className="flex-1 flex-row items-center gap-[5px]">
          <Ionicons color="#009a61" name="shield-checkmark-outline" size={15} />
          <Text
            className="flex-1 text-[11px] text-[#526986]"
            numberOfLines={1}
          >
            {tenant.idType} · {tenant.idNumber}
          </Text>
        </View>
        {tenant.idPhoto ? (
          <Pressable
            accessibilityLabel="View ID photo"
            className="ml-[8px] h-[30px] w-[30px] items-center justify-center rounded-[14px] bg-[#eef0ff]"
            onPress={() => onPreview(tenant.idPhoto as string, "ID photo")}
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
      <View className="flex-1 items-center justify-center bg-[rgba(4,10,24,0.96)] p-[20px]">
        <Pressable
          accessibilityLabel="Close image preview"
          className="absolute right-[20px] top-[52px] z-10 h-[44px] w-[44px] items-center justify-center rounded-[22px] bg-[rgba(255,255,255,0.18)]"
          onPress={onClose}
        >
          <Ionicons color="#fff" name="close" size={25} />
        </Pressable>
        {image ? (
          <Image
            accessibilityLabel={image.label}
            className="h-4/5 w-full"
            resizeMode="contain"
            source={{ uri: image.uri }}
          />
        ) : null}
      </View>
    </Modal>
  );
}
