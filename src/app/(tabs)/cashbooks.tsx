import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

import FloatingActionButton from "../../../components/FloatingAddButton";
import { CashbookListCard } from "../../features/cashbooks/components/CashbookListCard";
import { CashbookSummaryCard } from "../../features/cashbooks/components/CashbookSummaryCard";
import { useCashbooks } from "../../features/cashbooks/hooks/useCashbooks";
import {
  computeCashbookBalance,
  filterCashbooks,
} from "../../features/cashbooks/logic/cashbookCalculations";
import type { Cashbook } from "../../features/cashbooks/types";
import { useSelection } from "../../hooks/useSelection";

export default function CashbooksScreen() {
  const router = useRouter();
  const {
    cashbooks,
    entryBalances,
    summary,
    isLoading,
    refresh: loadCashbooks,
    remove: removeCashbooks,
  } = useCashbooks();
  const selection = useSelection();
  const { selectedIds } = selection;
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCashbooks = useMemo(
    () => filterCashbooks(cashbooks, searchQuery),
    [cashbooks, searchQuery],
  );

  const overdrawnCount = useMemo(
    () =>
      cashbooks.filter(
        (cashbook) =>
          computeCashbookBalance(cashbook, entryBalances[cashbook.id] ?? 0) <
          0,
      ).length,
    [cashbooks, entryBalances],
  );

  const isSelectionMode = selection.isSelectionMode;
  const allDisplayedSelected =
    filteredCashbooks.length > 0 &&
    filteredCashbooks.every((cashbook) => selectedIds.includes(cashbook.id));

  const toggleSelection = selection.toggle;

  const requestDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    Alert.alert(
      ids.length === 1 ? "Delete cash book?" : "Delete cash books?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await removeCashbooks(ids);
              selection.clear();
            })();
          },
        },
      ],
    );
  };

  const editSelectedCashbook = () => {
    if (selectedIds.length !== 1) {
      Alert.alert(
        "Select one cash book",
        "Edit is available when exactly one cash book is selected.",
      );
      return;
    }
    router.push({
      pathname: "/cashbook-AddNewBook",
      params: { id: selectedIds[0] },
    });
  };

  const openCashbook = (cashbook: Cashbook) => {
    if (isSelectionMode) {
      toggleSelection(cashbook.id);
      return;
    }
    router.push({
      pathname: "/cashbook-Inbox",
      params: { id: cashbook.id },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fc]" edges={["top"]}>
      <View className="px-4 pb-2 pt-2">
        {isSelectionMode ? (
          <View className="flex-row items-center justify-between">
            <View className="min-w-0 flex-1 flex-row items-center">
              <Pressable
                accessibilityLabel="Exit selection mode"
                className="mr-3 h-11 w-11 items-center justify-center rounded-full active:opacity-70"
                onPress={() => selection.clear()}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#334155"
                />
              </Pressable>
              <View className="min-w-0 flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#637b99]">
                  Selection
                </Text>
                <Text
                  className="text-[24px] font-extrabold text-[#0d162a]"
                  numberOfLines={1}
                >
                  {selectedIds.length} selected
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Pressable
                accessibilityLabel="Edit selected cash book"
                className={`mr-1.5 h-10 w-10 items-center justify-center rounded-full bg-white active:opacity-70 ${selectedIds.length === 1 ? "" : "opacity-40"}`}
                onPress={editSelectedCashbook}
                style={{
                  shadowColor: "#0d162a",
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 1,
                }}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={20}
                  color="#4C45F5"
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Select all displayed cash books"
                className="mr-1.5 h-10 w-10 items-center justify-center rounded-full bg-white active:opacity-70"
                onPress={() =>
                  selection.replace(
                    allDisplayedSelected
                      ? []
                      : filteredCashbooks.map((cashbook) => cashbook.id),
                  )
                }
                style={{
                  shadowColor: "#0d162a",
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 1,
                }}
              >
                <MaterialCommunityIcons
                  name={
                    allDisplayedSelected
                      ? "checkbox-marked"
                      : "checkbox-multiple-blank-outline"
                  }
                  size={21}
                  color="#4C45F5"
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Delete selected cash books"
                className="h-10 w-10 items-center justify-center rounded-full bg-white active:opacity-70"
                onPress={() => requestDelete(selectedIds)}
                style={{
                  shadowColor: "#0d162a",
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 1,
                }}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={21}
                  color="#DC2626"
                />
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#637b99]">
                Ledger
              </Text>
              <Text
                className="text-[26px] font-extrabold text-[#0d162a]"
                numberOfLines={1}
              >
                Cash Books
              </Text>
              <Text className="mt-0.5 text-[12px] text-[#7c8ba1]">
                Your local cash notebooks
              </Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={filteredCashbooks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void loadCashbooks()}
          />
        }
        ListHeaderComponent={
          <View className="mt-1">
            {cashbooks.length > 0 ? (
              <CashbookSummaryCard
                bookCount={cashbooks.length}
                overdrawnCount={overdrawnCount}
                summary={summary}
              />
            ) : null}

            <View className="mx-4 mb-3 min-h-[38px] flex-row items-center rounded-[18px] border border-[#dfe7f0] bg-white px-[13px]">
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color="#7890ae"
              />
              <TextInput
                accessibilityLabel="Search cash books"
                className="ml-[9px] flex-1 py-[9px] text-[13px] text-[#1b2e49]"
                placeholder="Search cash books"
                placeholderTextColor="#7890ae"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchQuery ? (
                <Pressable
                  accessibilityLabel="Clear search"
                  className="active:opacity-70"
                  onPress={() => setSearchQuery("")}
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={18}
                    color="#7890ae"
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        }

        ListEmptyComponent={
          <View className="mx-4 mt-2 items-center rounded-[24px] border border-[#e4eaf2] bg-white px-6 py-12">
            <View className="mb-3 h-16 w-16 items-center justify-center rounded-[20px] bg-[#EBECFF]">
              <MaterialCommunityIcons
                name="book-plus-outline"
                size={30}
                color="#4C45F5"
              />
            </View>
            <Text className="text-[16px] font-extrabold text-[#1a2b44]">
              {searchQuery ? "No cash books found" : "No cash books yet"}
            </Text>
            <Text className="mt-1 text-center text-[13px] leading-5 text-[#7890ae]">
              {searchQuery
                ? "Try a different name or description."
                : "Tap + to create your first cash notebook."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <CashbookListCard
            cashbook={item}
            index={index}
            balance={computeCashbookBalance(
              item,
              entryBalances[item.id] ?? 0,
            )}
            selected={selectedIds.includes(item.id)}
            onPress={() => openCashbook(item)}
            onLongPress={() => {
              if (!isSelectionMode) selection.selectOnly(item.id);
            }}
          />
        )}
      />

      <FloatingActionButton
        backgroundColor="#2563EB"
        bottom={20}
        right={20}
        actions={[
          {
            label: "Add Cash Book",
            icon: "book-plus",
            onPress: () => router.push("/cashbook-AddNewBook"),
          },
          {
            label: "Add Entry",
            icon: "pen-plus",
            onPress: () => {
              router.push({
                pathname: "/cashbook-AddNewEntry",
                params:
                  cashbooks.length === 1
                    ? { cashbookId: cashbooks[0].id, selectCashbook: "true" }
                    : { selectCashbook: "true" },
              });
            },
          },
        ]}
      />
    </SafeAreaView>
  );
}
