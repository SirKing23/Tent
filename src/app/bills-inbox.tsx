import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { BillListCard } from "../features/bills/components/BillListCard";
import { BillSummaryCard } from "../features/bills/components/BillSummaryCard";
import { useBills } from "../features/bills/hooks/useBills";
import {
  filterBills,
  getBillingSummary,
} from "../features/bills/logic/billingRules";
import { useSelection } from "../hooks/useSelection";

export default function BillsInboxScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const {
    bills,
    isLoading,
    refresh: refreshBills,
    remove: removeBills,
  } = useBills();
  const selection = useSelection();
  const { selectedIds } = selection;

  const filteredBills = useMemo(
    () => filterBills(bills, searchQuery),
    [bills, searchQuery],
  );

  const totals = useMemo(() => getBillingSummary(bills), [bills]);

  const isSelectionMode = selection.isSelectionMode;
  const allDisplayedSelected =
    filteredBills.length > 0 &&
    filteredBills.every((bill) => selectedIds.includes(bill.id));

  const toggleSelection = selection.toggle;

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
                const blockedIds = await removeBills(ids);
                selection.replace(blockedIds);

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
                onPress={() => selection.clear()}
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
                  selection.replace(
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
          <BillSummaryCard
            label="Total items"
            value={totals.total}
            colorClass="text-[#009a61]"
          />
          <BillSummaryCard
            label="With amount"
            value={totals.withAmount}
            colorClass="text-[#d96a00]"
          />
          <BillSummaryCard
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
          <RefreshControl refreshing={isLoading} onRefresh={() => void refreshBills()} />
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
        renderItem={({ item }) => (
          <BillListCard
            bill={item}
            selected={selectedIds.includes(item.id)}
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
              if (!isSelectionMode) selection.selectOnly(item.id);
            }}
          />
        )}
      />
    </View>
  );
}
