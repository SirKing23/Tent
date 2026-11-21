import Ionicons from "@react-native-vector-icons/ionicons";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ImagePreviewModal } from "../features/tenants/components/ImagePreviewModal";
import { TenantCard } from "../features/tenants/components/TenantCard";
import { TenantSummaryCard } from "../features/tenants/components/TenantSummaryCard";
import { useTenants } from "../features/tenants/hooks/useTenants";
import {
  countTenantsByStatus,
  filterTenants,
} from "../features/tenants/logic/tenantRules";
import type { TenantStatus } from "../features/tenants/types";
import { useSelection } from "../hooks/useSelection";

export default function TenantsInboxScreen() {
  const router = useRouter();
  const { tenants, remove: removeTenants } = useTenants();
  const selection = useSelection();
  const { selectedIds } = selection;
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<{ uri: string; label: string } | null>(
    null,
  );
  const visibleTenants = useMemo(
    () => filterTenants(tenants, query),
    [query, tenants],
  );
  const statusCounts = useMemo(
    () => countTenantsByStatus(tenants),
    [tenants],
  );
  const count = (status: TenantStatus) => statusCounts[status];
  const isSelectionMode = selection.isSelectionMode;
  const allDisplayedSelected =
    visibleTenants.length > 0 &&
    visibleTenants.every((tenant) => selectedIds.includes(tenant.id));
  const toggleSelection = selection.toggle;
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
              await removeTenants(ids);
              selection.clear();
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
                  selection.replace(
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
          <TenantSummaryCard
            label="Active"
            value={count("Active")}
            colorClass="text-[#009a61]"
          />
          <TenantSummaryCard
            label="Inactive"
            value={count("Inactive")}
            colorClass="text-[#d96a00]"
          />
          <TenantSummaryCard
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
                if (!isSelectionMode) selection.selectOnly(tenant.id);
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
      <ImagePreviewModal image={preview} onClose={() => setPreview(null)} />
    </SafeAreaView>
  );
}
