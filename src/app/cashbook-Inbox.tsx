import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    FlatList,
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
import { CashbookEntryRow } from "../features/cashbooks/components/CashbookEntryRow";
import { CashbookTotals } from "../features/cashbooks/components/CashbookTotals";
import { useCashbookEntries } from "../features/cashbooks/hooks/useCashbookEntries";
import { filterCashbookEntries } from "../features/cashbooks/logic/cashbookCalculations";
import type { CashbookEntry } from "../features/cashbooks/types";
import { useImageSourcePicker } from "../hooks/useImageSourcePicker";
import { useSelection } from "../hooks/useSelection";
import { resolvePhotoUri } from "../services/photoStorage";

export default function CashbookEntriesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    bookTitle,
    entries,
    totals,
    isLoading,
    refresh: loadEntries,
    remove: removeEntries,
    attachImage,
  } = useCashbookEntries(id);
  const selection = useSelection();
  const { selectedIds } = selection;
  const { pickImages } = useImageSourcePicker();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const filteredEntries = useMemo(
    () => filterCashbookEntries(entries, searchQuery),
    [entries, searchQuery],
  );

  const isSelectionMode = selection.isSelectionMode;
  const allDisplayedSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every((entry) => selectedIds.includes(entry.id));

  const toggleSelection = selection.toggle;

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
              await removeEntries(ids);
              selection.clear();
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

  const chooseImageForEntry = (entry: CashbookEntry) => {
    if (isSelectionMode) {
      toggleSelection(entry.id);
      return;
    }

    const takePhoto = async () => {
      const [uri] = await pickImages("camera");
      if (uri) await attachImage(entry, uri);
    };

    const chooseFromLibrary = async () => {
      const [uri] = await pickImages("gallery");
      if (uri) await attachImage(entry, uri);
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
                onPress={() => selection.clear()}
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
                  selection.replace(
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

        <CashbookTotals totals={totals} />
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
        renderItem={({ item }) => (
          <CashbookEntryRow
            entry={item}
            selected={selectedIds.includes(item.id)}
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
              if (!isSelectionMode) selection.selectOnly(item.id);
            }}
            onImagePress={() => {
              if (isSelectionMode) {
                toggleSelection(item.id);
              } else {
                setSelectedImageUri(resolvePhotoUri(item.imageUri));
              }
            }}
            onAddImagePress={() => chooseImageForEntry(item)}
          />
        )}
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
