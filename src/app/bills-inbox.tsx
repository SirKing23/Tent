import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

import "../../global.css";
import {
  deleteBillingItems,
  getBillingItems,
  type BillingItem,
  type UtilityType,
} from "../lib/bills";

const getUtilityIcon = (utilityType: UtilityType) => {
  switch (utilityType) {
    case "Internet":
      return "wifi";
    case "Water":
      return "water-outline";
    case "Electricity":
      return "flash-outline";
    case "Rent":
      return "home-city-outline";
    case "Other bills":
    default:
      return "file-document-outline";
  }
};

const getUtilityIconStyle = (utilityType: UtilityType) => {
  switch (utilityType) {
    case "Internet":
      return { backgroundColor: "#EEF2FF", iconColor: "#4F46E5" };
    case "Water":
      return { backgroundColor: "#E0F7FA", iconColor: "#0891B2" };
    case "Electricity":
      return { backgroundColor: "#FEF3C7", iconColor: "#D97706" };
    case "Rent":
      return { backgroundColor: "#FFEDD5", iconColor: "#C2410C" };
    case "Other bills":
    default:
      return { backgroundColor: "#F1F5F9", iconColor: "#475569" };
  }
};

const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function BillsInboxScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [bills, setBills] = useState<BillingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const loadBills = useCallback(async () => {
    setIsLoading(true);
    setBills(await getBillingItems());
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBills();
    }, [loadBills]),
  );

  const filteredBills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return bills;
    return bills.filter((bill) =>
      [bill.name, bill.billingType, bill.displayUnit, bill.dueDateType]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [bills, searchQuery]);

  const totals = useMemo(
    () => ({
      total: bills.length,
      withAmount: bills.filter((bill) => bill.defaultAmount !== undefined)
        .length,
      recurring: bills.filter(
        (bill) => bill.dueDateType === "Recurring monthly",
      ).length,
    }),
    [bills],
  );

  const refreshBills = () => void loadBills();

  const isSelectionMode = selectedIds.length > 0;
  const allDisplayedSelected =
    filteredBills.length > 0 &&
    filteredBills.every((bill) => selectedIds.includes(bill.id));

  const toggleSelection = (billId: string) => {
    setSelectedIds((current) =>
      current.includes(billId)
        ? current.filter((id) => id !== billId)
        : [...current, billId],
    );
  };

  const requestDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    Alert.alert(
      ids.length === 1 ? "Delete billing item?" : "Delete billing items?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                const blockedIds = await deleteBillingItems(ids);
                setSelectedIds(blockedIds);
                await loadBills();

                if (blockedIds.length > 0) {
                  const blockedNames = bills
                    .filter((bill) => blockedIds.includes(bill.id))
                    .map((bill) => bill.name);
                  Alert.alert(
                    "Some bills were not deleted",
                    `${blockedNames.join(", ") || "Selected bills"} are assigned to properties. Remove them from their properties first.`,
                  );
                }
              } catch (error) {
                console.error("Unable to delete billing items:", error);
                Alert.alert(
                  "Unable to delete bills",
                  "Please try again.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const editSelectedBill = () => {
    if (selectedIds.length !== 1) {
      Alert.alert(
        "Select one billing item",
        "Edit is available when exactly one item is selected.",
      );
      return;
    }
    router.push({
      pathname: "/bills-AddNewBill",
      params: { id: selectedIds[0] },
    });
  };

  return (
    <View className="flex-1 bg-[#f7f9fc]">
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
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#334155"
                />
              </Pressable>
              <Text className="text-[18px] font-extrabold text-[#0f172a]">
                {selectedIds.length} selected
              </Text>
            </View>
            <View className="flex-row items-center">
              <Pressable
                accessibilityLabel="Edit selected billing item"
                className={`ml-[4px] h-[44px] w-[44px] items-center justify-center rounded-[22px] ${selectedIds.length === 1 ? "" : "opacity-40"}`}
                onPress={editSelectedBill}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={22}
                  color="#2563EB"
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Select all displayed billing items"
                className="ml-[4px] h-[44px] w-[44px] items-center justify-center rounded-[22px]"
                onPress={() =>
                  setSelectedIds(
                    allDisplayedSelected
                      ? []
                      : filteredBills.map((bill) => bill.id),
                  )
                }
              >
                <MaterialCommunityIcons
                  name={
                    allDisplayedSelected
                      ? "checkbox-marked"
                      : "checkbox-multiple-blank-outline"
                  }
                  size={23}
                  color="#0F766E"
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Delete selected billing items"
                className="ml-[4px] h-[44px] w-[44px] items-center justify-center rounded-[22px]"
                onPress={() => requestDelete(selectedIds)}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={23}
                  color="#DC2626"
                />
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center justify-between pb-[22px] pt-[11px]">
            <View>
              <Text className="mb-[3px] text-[13px] text-[#29466c]">
                Scheduled Bills
              </Text>
              <Text className="text-[26px] font-extrabold text-[#0d162a]">
                Bills
              </Text>
            </View>
            <Pressable
              className="flex-row items-center gap-[7px] rounded-[20px] bg-[#5041df] px-[15px] py-[12px]"
              onPress={() => router.push("/bills-AddNewBill")}
            >
              <Ionicons color="#fff" name="add-outline" size={17} />
              <Text className="text-[14px] font-bold text-white">New Bill</Text>
            </Pressable>
          </View>
        )}

        <View className="mb-[20px] flex-row gap-[10px]">
          <SummaryCard
            label="Total items"
            value={totals.total}
            colorClass="text-[#009a61]"
          />
          <SummaryCard
            label="With amount"
            value={totals.withAmount}
            colorClass="text-[#d96a00]"
          />
          <SummaryCard
            label="Recurring"
            value={totals.recurring}
            colorClass="text-[#5146e5]"
          />
        </View>

        <View className="min-h-[38px] flex-row items-center rounded-[18px] border border-[#dfe7f0] bg-white px-[13px]">
          <Ionicons color="#7890ae" name="search-outline" size={20} />
          <TextInput
            accessibilityLabel="Search bills"
            className="ml-[9px] flex-1 py-[9px] text-[13px] text-[#1b2e49]"
            placeholder="Search bills"
            placeholderTextColor="#7890ae"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable
              accessibilityLabel="Clear bill search"
              onPress={() => setSearchQuery("")}
            >
              <Ionicons color="#7890ae" name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredBills}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshBills} />
        }
        ListEmptyComponent={
          <View className="items-center px-8 py-20">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <MaterialCommunityIcons
                name="file-document-outline"
                size={40}
                color="#2563EB"
              />
            </View>
            <Text className="text-center text-lg font-bold text-slate-900">
              {searchQuery ? "No bills found" : "No billing items yet"}
            </Text>
            <Text className="mt-2 text-center leading-5 text-slate-500">
              {searchQuery
                ? "Try a different search."
                : "Tap + to create your first billing item."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const utilityIconStyle = getUtilityIconStyle(item.utilityType);
          const dueDateSummary =
            item.dueDateType === "Fixed date"
              ? item.fixedDueDate
              : item.dueDateType === "Recurring monthly"
                ? item.recurringRule === "Day of the month"
                  ? `Day ${item.recurringDay ?? "—"} of each month`
                  : (item.recurringRule ?? item.dueDateType)
                : item.dueDateType;
          return (
            <Pressable
              className="mx-3 mb-2 h-[88px] flex-row items-center overflow-hidden rounded-xl bg-white shadow-sm"
              android_ripple={{ color: "#DBEAFE" }}
              onPress={() => {
                if (isSelectionMode) {
                  toggleSelection(item.id);
                  return;
                }
                router.push({
                  pathname: "/bills-AddNewBill",
                  params: { id: item.id },
                });
              }}
              onLongPress={() => {
                if (!isSelectionMode) setSelectedIds([item.id]);
              }}
              delayLongPress={300}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View
                className="h-full w-[82px] items-center justify-center"
                style={{ backgroundColor: utilityIconStyle.backgroundColor }}
              >
                {selectedIds.includes(item.id) ? (
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-teal-700">
                    <MaterialCommunityIcons
                      name="check"
                      size={23}
                      color="#FFFFFF"
                    />
                  </View>
                ) : (
                  <MaterialCommunityIcons
                    name={getUtilityIcon(item.utilityType)}
                    size={34}
                    color={utilityIconStyle.iconColor}
                  />
                )}
              </View>
              <View className="min-w-0 flex-1 px-3">
                <View className="flex-row items-center">
                  <Text
                    className="min-w-0 flex-1 text-base font-bold text-slate-900"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text className="ml-2 text-sm font-bold text-slate-900">
                    {item.defaultAmount === undefined
                      ? "—"
                      : formatCurrency(item.defaultAmount)}
                  </Text>
                </View>
                <Text className="mt-1 text-sm text-slate-500" numberOfLines={1}>
                  {item.billingType}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <Text
                    className="flex-1 text-xs text-slate-500"
                    numberOfLines={1}
                  >
                    {item.displayUnit || "No display unit"} · {dueDateSummary}
                  </Text>
                  <View className="rounded-full bg-blue-50 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-blue-700">
                      {item.dueDateType}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function SummaryCard({
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
