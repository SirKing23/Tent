import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

import FloatingActionButton from "../../../components/FloatingAddButton";
import "../../../global.css";
import { getCashbookEntries } from "../../lib/cashbook-Inbox";
import { Cashbook, deleteCashbooks, getCashbooks } from "../../lib/cashbooks";

const avatarColors = ["#2563EB", "#7C3AED", "#0891B2", "#059669", "#D97706"];

const getDescriptionPreview = (description: string) => {
  const words = description.trim().split(/\s+/).filter(Boolean);
  return words.length > 5 ? `${words.slice(0, 5).join(" ")}…` : words.join(" ");
};

const formatBalance = (balance: number) => {
  const value = Math.abs(balance).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return {
    label: `${balance < 0 ? "−" : ""}₱${value}`,
    color: balance > 0 ? "#15803D" : balance < 0 ? "#DC2626" : "#64748B",
  };
};

export default function CashbooksScreen() {
  const router = useRouter();
  const [cashbooks, setCashbooks] = useState<Cashbook[]>([]);
  const [entryBalances, setEntryBalances] = useState<Record<string, number>>(
    {},
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCashbooks = useCallback(async () => {
    setIsLoading(true);
    const [loadedCashbooks, entries] = await Promise.all([
      getCashbooks(),
      getCashbookEntries(),
    ]);
    const balances = entries.reduce<Record<string, number>>((result, entry) => {
      const currentBalance = result[entry.cashbookId] ?? 0;
      result[entry.cashbookId] =
        currentBalance +
        (entry.type === "cashIn" ? entry.amount : -entry.amount);
      return result;
    }, {});
    setCashbooks(loadedCashbooks);
    setEntryBalances(balances);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCashbooks();
    }, [loadCashbooks]),
  );

  const filteredCashbooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return cashbooks;
    return cashbooks.filter(
      (cashbook) =>
        cashbook.title.toLowerCase().includes(query) ||
        cashbook.description.toLowerCase().includes(query),
    );
  }, [cashbooks, searchQuery]);

  const isSelectionMode = selectedIds.length > 0;
  const allDisplayedSelected =
    filteredCashbooks.length > 0 &&
    filteredCashbooks.every((cashbook) => selectedIds.includes(cashbook.id));

  const toggleSelection = (cashbookId: string) => {
    setSelectedIds((current) =>
      current.includes(cashbookId)
        ? current.filter((id) => id !== cashbookId)
        : [...current, cashbookId],
    );
  };

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
              await deleteCashbooks(ids);
              setSelectedIds([]);
              await loadCashbooks();
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="border-b border-slate-200 bg-white px-4 pb-3 pt-2">
        {isSelectionMode ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Pressable
                accessibilityLabel="Exit selection mode"
                className="mr-3 h-11 w-11 items-center justify-center rounded-full"
                onPress={() => setSelectedIds([])}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#334155"
                />
              </Pressable>
              <Text className="text-lg font-bold text-slate-900">
                {selectedIds.length} selected
              </Text>
            </View>
            <View className="flex-row items-center">
              <Pressable
                accessibilityLabel="Edit selected cash book"
                className={`mr-2 h-11 w-11 items-center justify-center rounded-full ${selectedIds.length === 1 ? "" : "opacity-40"}`}
                onPress={editSelectedCashbook}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={22}
                  color="#2563EB"
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Select all displayed cash books"
                className="mr-2 h-11 w-11 items-center justify-center rounded-full"
                onPress={() =>
                  setSelectedIds(
                    allDisplayedSelected
                      ? []
                      : filteredCashbooks.map((cashbook) => cashbook.id),
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
                  color="#2563EB"
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Delete selected cash books"
                className="h-11 w-11 items-center justify-center rounded-full"
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
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-slate-900">
                Cash Books
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500">
                Your local cash notebooks
              </Text>
            </View>
           
          </View>
        )}

        <View className="flex-row items-center rounded-2xl bg-slate-100 px-3">
          <MaterialCommunityIcons name="magnify" size={22} color="#64748B" />
          <TextInput
            accessibilityLabel="Search cash books"
            className="h-11 flex-1 px-2 text-base text-slate-900"
            placeholder="Search cash books"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable
              accessibilityLabel="Clear search"
              onPress={() => setSearchQuery("")}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={19}
                color="#94A3B8"
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredCashbooks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void loadCashbooks()}
          />
        }

        ListEmptyComponent={
          <View className="items-center px-8 py-20">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <MaterialCommunityIcons
                name="book-plus-outline"
                size={32}
                color="#2563EB"
              />
            </View>
            <Text className="text-center text-lg font-bold text-slate-900">
              {searchQuery ? "No cash books found" : "No cash books yet"}
            </Text>
            <Text className="mt-2 text-center leading-5 text-slate-500">
              {searchQuery
                ? "Try a different name or description."
                : "Tap + to create your first cash notebook."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const selected = selectedIds.includes(item.id);
          const balance = formatBalance(
            item.initialCashIn -
              item.initialCashOut +
              (entryBalances[item.id] ?? 0),
          );
          return (
            <Pressable
              className={`mx-3 mb-1 min-h-[78px] flex-row items-center rounded-lg border px-3 py-3 ${selected ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}
              onPress={() => openCashbook(item)}
              onLongPress={() => {
                if (!isSelectionMode) setSelectedIds([item.id]);
              }}
              delayLongPress={300}
            >
              <View
                className="mr-3 h-11 w-11 items-center justify-center rounded-full"
                style={{
                  backgroundColor: avatarColors[index % avatarColors.length],
                }}
              >
                {selected ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={23}
                    color="#FFFFFF"
                  />
                ) : (
                  <Text className="text-lg font-bold text-white">
                    {item.title.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View className="min-w-0 flex-1 pr-2">
                <Text
                  className="text-base font-bold text-slate-900"
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  className="mt-0.5 text-sm text-slate-500"
                  numberOfLines={1}
                >
                  {getDescriptionPreview(item.description) || "No description"}
                </Text>
              </View>
              <Text
                className="text-sm font-bold"
                style={{ color: balance.color }}
              >
                {balance.label}
              </Text>
            </Pressable>
          );
        }}
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
