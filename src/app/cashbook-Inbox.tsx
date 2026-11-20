import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
    Stack,
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import FloatingActionButton from "../../components/FloatingAddButton";
import ZoomableImage from "../../components/ZoomableImage";
import "../../global.css";
import {
    deleteCashbookEntries,
    getEntriesForCashbook,
    saveCashbookEntry,
    type CashbookEntry,
} from "../lib/cashbook-Inbox";
import { getCashbooks } from "../lib/cashbooks";
import { persistPhoto, resolvePhotoUri } from "../lib/photoStorage";

const formatAmount = (entry: CashbookEntry) => {
  const value = entry.amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${entry.type === "cashOut" ? "−" : "+"}₱${value}`;
};

const formatCurrency = (amount: number) =>
  `₱${Math.abs(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getDescriptionPreview = (description: string) => {
  const words = description.trim().split(/\s+/).filter(Boolean);
  return words.length > 5 ? `${words.slice(0, 5).join(" ")}…` : words.join(" ");
};

const formatEntryDate = (date: string) => {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return parsedDate.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
};

export default function CashbookEntriesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [bookTitle, setBookTitle] = useState("Cash Book");
  const [initialCashIn, setInitialCashIn] = useState(0);
  const [initialCashOut, setInitialCashOut] = useState(0);
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    const [cashbooks, bookEntries] = await Promise.all([
      getCashbooks(),
      getEntriesForCashbook(id),
    ]);
    const cashbook = cashbooks.find((item) => item.id === id);
    setBookTitle(cashbook?.title ?? "Cash Book");
    setInitialCashIn(cashbook?.initialCashIn ?? 0);
    setInitialCashOut(cashbook?.initialCashOut ?? 0);
    setEntries(bookEntries);
    setIsLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [loadEntries]),
  );

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter(
      (entry) =>
        entry.description.toLowerCase().includes(query) ||
        entry.paymentMode.toLowerCase().includes(query) ||
        (entry.type === "cashIn" ? "cash in" : "cash out").includes(query),
    );
  }, [entries, searchQuery]);

  const totals = useMemo(() => {
    const totalCashIn = entries.reduce(
      (total, entry) => total + (entry.type === "cashIn" ? entry.amount : 0),
      initialCashIn,
    );
    const totalCashOut = entries.reduce(
      (total, entry) => total + (entry.type === "cashOut" ? entry.amount : 0),
      initialCashOut,
    );
    return {
      totalCashIn,
      totalCashOut,
      balance: totalCashIn - totalCashOut,
    };
  }, [entries, initialCashIn, initialCashOut]);

  const isSelectionMode = selectedIds.length > 0;
  const allDisplayedSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every((entry) => selectedIds.includes(entry.id));

  const toggleSelection = (entryId: string) => {
    setSelectedIds((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId],
    );
  };

  const requestDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    Alert.alert(
      ids.length === 1 ? "Delete entry?" : "Delete entries?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await deleteCashbookEntries(ids);
              setSelectedIds([]);
              await loadEntries();
            })();
          },
        },
      ],
    );
  };

  const editSelectedEntry = () => {
    if (selectedIds.length !== 1) {
      Alert.alert(
        "Select one entry",
        "Edit is available when exactly one entry is selected.",
      );
      return;
    }
    router.push({
      pathname: "/cashbook-AddNewEntry",
      params: { cashbookId: id, entryId: selectedIds[0] },
    });
  };

  const saveEntryImage = async (entry: CashbookEntry, imageUri: string) => {
    // Copy the picked photo into app-private storage before saving it.
    const storedImageUri = await persistPhoto(imageUri, "entry-photo");
    await saveCashbookEntry({
      ...entry,
      imageUri: storedImageUri ?? undefined,
    });
    await loadEntries();
  };

  const chooseImageForEntry = (entry: CashbookEntry) => {
    if (isSelectionMode) {
      toggleSelection(entry.id);
      return;
    }

    const takePhoto = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Camera access is needed to add a picture.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled) {
        await saveEntryImage(entry, result.assets[0].uri);
      }
    };

    const chooseFromLibrary = async () => {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Photo-library access is needed to add a picture.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled) {
        await saveEntryImage(entry, result.assets[0].uri);
      }
    };

    Alert.alert("Add photo", "Choose a photo source", [
      { text: "Cancel", style: "cancel" },
      { text: "Take photo", onPress: () => void takePhoto() },
      { text: "Choose from library", onPress: () => void chooseFromLibrary() },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Cash Book" }} />
      <View className="border-b border-slate-100 bg-white px-4 pb-3 pt-2">
        {isSelectionMode ? (
          <View className="mb-3 flex-row items-center justify-between">
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
                accessibilityLabel="Edit selected entry"
                className={`mr-2 h-11 w-11 items-center justify-center rounded-full ${selectedIds.length === 1 ? "" : "opacity-40"}`}
                onPress={editSelectedEntry}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={22}
                  color="#2563EB"
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Select all displayed entries"
                className="mr-2 h-11 w-11 items-center justify-center rounded-full"
                onPress={() =>
                  setSelectedIds(
                    allDisplayedSelected
                      ? []
                      : filteredEntries.map((entry) => entry.id),
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
                accessibilityLabel="Delete selected entries"
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
          <View className="mb-3 mt-4 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-bold text-slate-900">
                {bookTitle}
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500">Inbox</Text>
            </View>
          </View>
        )}

        <View className="flex-row items-center rounded-2xl bg-slate-100 px-3">
          <MaterialCommunityIcons name="magnify" size={22} color="#64748B" />
          <TextInput
            accessibilityLabel="Search entries"
            className="h-11 flex-1 px-2 text-base text-slate-900"
            placeholder="Search entries"
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

        <View className="mt-3 flex-row gap-2">
          <View className="flex-1 rounded-xl bg-emerald-50 px-2.5 py-2">
            <Text className="text-[10px] font-semibold uppercase text-emerald-700">
              Total cash in
            </Text>
            <Text
              className="mt-1 text-sm font-bold text-emerald-800"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {formatCurrency(totals.totalCashIn)}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-rose-50 px-2.5 py-2">
            <Text className="text-[10px] font-semibold uppercase text-rose-700">
              Total cash out
            </Text>
            <Text
              className="mt-1 text-sm font-bold text-rose-800"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {formatCurrency(totals.totalCashOut)}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-slate-100 px-2.5 py-2">
            <Text className="text-[10px] font-semibold uppercase text-slate-500">
              Balance
            </Text>
            <Text
              className={`mt-1 text-sm font-bold ${totals.balance > 0 ? "text-emerald-700" : totals.balance < 0 ? "text-rose-700" : "text-slate-600"}`}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {totals.balance < 0 ? "−" : ""}
              {formatCurrency(totals.balance)}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void loadEntries()}
          />
        }
        ListEmptyComponent={
          <View className="items-center px-8 py-20">
            <View className="mb-4 h-16 w-16 items-center justify-center ">
              <MaterialCommunityIcons
                name="note-plus"
                size={40}
                color="#2563EB"
              />
            </View>
            <Text className="text-center text-lg font-bold text-slate-900">
              {searchQuery ? "No entries found" : "No entries yet"}
            </Text>
            <Text className="mt-2 text-center leading-5 text-slate-500">
              {searchQuery
                ? "Try a different search."
                : "Tap + to record the first entry."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCashOut = item.type === "cashOut";
          return (
            <Pressable
              className={`mx-3 mb-1 h-[78px] flex-row items-center overflow-hidden rounded-lg border ${selectedIds.includes(item.id) ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"}`}
              onPress={() => {
                if (isSelectionMode) {
                  toggleSelection(item.id);
                  return;
                }
                router.push({
                  pathname: "/cashbook-AddNewEntry",
                  params: { cashbookId: item.cashbookId, entryId: item.id },
                });
              }}
              onLongPress={() => {
                if (!isSelectionMode) setSelectedIds([item.id]);
              }}
              delayLongPress={300}
            >
              {selectedIds.includes(item.id) ? (
                <View className="mr-3 h-[78px] w-[78px] items-center justify-center">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-teal-700">
                    <MaterialCommunityIcons
                      name="check"
                      size={23}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              ) : item.imageUri ? (
                <Pressable
                  accessibilityLabel="View entry image"
                  className="mr-3 h-[78px] w-[78px]"
                  onPress={() => {
                    if (isSelectionMode) {
                      toggleSelection(item.id);
                    } else {
                      setSelectedImageUri(resolvePhotoUri(item.imageUri));
                    }
                  }}
                  onLongPress={() => {
                    if (!isSelectionMode) setSelectedIds([item.id]);
                  }}
                  delayLongPress={300}
                >
                  <Image
                    source={{
                      uri: resolvePhotoUri(item.imageUri) ?? item.imageUri,
                    }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                </Pressable>
              ) : (
                <Pressable
                  accessibilityLabel="Add image to entry"
                  className={`mr-3 h-[78px] w-[78px] items-center justify-center ${isCashOut ? "bg-rose-50" : "bg-emerald-50"}`}
                  onPress={() => chooseImageForEntry(item)}
                  onLongPress={() => {
                    if (!isSelectionMode) setSelectedIds([item.id]);
                  }}
                  delayLongPress={300}
                >
                  <MaterialCommunityIcons
                    name={isCashOut ? "arrow-top-right" : "arrow-bottom-left"}
                    size={22}
                    color={isCashOut ? "#DC2626" : "#047857"}
                  />
                </Pressable>
              )}
              <View className="min-w-0 flex-1 pr-2">
                <View className="flex-row items-center">
                  <Text
                    className="min-w-0 flex-1 text-base font-bold text-slate-900"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.description || (isCashOut ? "Cash out" : "Cash in")}
                  </Text>
                  <Text
                    className="ml-2 w-[58px] text-right text-xs text-slate-800"
                    numberOfLines={1}
                  >
                    {formatEntryDate(item.date)} •
                  </Text>
                </View>
                <Text
                  className={`w-[130px] shrink text-left text-sm font-bold ${isCashOut ? "text-rose-600" : "text-emerald-700"}`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                >
                  {formatAmount(item)}
                </Text>
                <Text
                  className="mt-0.5 text-sm text-slate-500"
                  numberOfLines={1}
                >
                  {getDescriptionPreview(item.paymentMode)} ·{" "}
                  {isCashOut ? "Cash out" : "Cash in"}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      <FloatingActionButton
        backgroundColor="#2563EB"
        bottom={105}
        right={20}
        actions={[
          {
            label: "Cash In",
            icon: "cash-plus",
            iconColor: "#15803D",
            onPress: () =>
              router.push({
                pathname: "/cashbook-AddNewEntry",
                params: { cashbookId: id, type: "cashIn" },
              }),
          },
          {
            label: "Cash Out",
            icon: "cash-remove",
            iconColor: "#DC2626",
            onPress: () =>
              router.push({
                pathname: "/cashbook-AddNewEntry",
                params: { cashbookId: id, type: "cashOut" },
              }),
          },
        ]}
      />

      <Modal
        visible={Boolean(selectedImageUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageUri(null)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center bg-black/95">
            <Pressable
              accessibilityLabel="Close full-screen image"
              className="absolute right-5 top-12 z-10 h-11 w-11 items-center justify-center rounded-full bg-white/20"
              onPress={() => setSelectedImageUri(null)}
            >
              <MaterialCommunityIcons name="close" size={25} color="#FFFFFF" />
            </Pressable>
            {selectedImageUri ? <ZoomableImage uri={selectedImageUri} /> : null}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}
