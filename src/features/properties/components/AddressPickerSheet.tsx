import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  matchesAddressQuery,
  MAX_PICKER_RESULTS,
  type AddressPickerItem,
} from "../logic/phAddresses";

/**
 * Searchable list used for country/province/city/barangay. A dropdown menu is
 * unusable at 1,634 cities and 200+ barangays, so this is a full-screen sheet
 * with a filter box.
 */
export function AddressPickerSheet({
  visible,
  title,
  items,
  placeholder = "Search",
  emptyLabel,
  allowCustom = true,
  isLoading = false,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: readonly AddressPickerItem[];
  placeholder?: string;
  emptyLabel: string;
  /** Lets the user keep text that is not in the list (new or renamed places). */
  allowCustom?: boolean;
  isLoading?: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) =>
      matchesAddressQuery(item.label, query),
    );
    return filtered.slice(0, MAX_PICKER_RESULTS);
  }, [items, query]);

  const trimmedQuery = query.trim();
  const customValue =
    allowCustom &&
    trimmedQuery.length > 0 &&
    !items.some((item) => item.label.toLowerCase() === trimmedQuery.toLowerCase())
      ? trimmedQuery
      : null;

  // Clearing here (instead of an effect) keeps the next visit to the picker
  // starting from the full list.
  const close = () => {
    setQuery("");
    onClose();
  };

  const choose = (value: string) => {
    setQuery("");
    onSelect(value);
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={close} visible={visible}>
      <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
        <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-3">
          <Text className="flex-1 pr-3 text-base font-extrabold text-slate-900">
            {title}
          </Text>
          <Pressable
            accessibilityLabel="Close picker"
            accessibilityRole="button"
            className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:opacity-70"
            onPress={close}
          >
            <MaterialCommunityIcons name="close" size={20} color="#475569" />
          </Pressable>
        </View>

        <View className="px-4 py-3">
          <TextInput
            accessibilityLabel={`Search ${title}`}
            autoCorrect={false}
            className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900"
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            value={query}
          />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#4C45F5" size="large" />
            <Text className="mt-2 text-xs text-slate-500">
              Loading address lists…
            </Text>
          </View>
        ) : (
          <FlatList
            data={visibleItems}
            initialNumToRender={20}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.key}
            ListEmptyComponent={
              customValue ? undefined : (
                <View className="px-6 py-10">
                  <Text className="text-center text-sm text-slate-500">
                    {emptyLabel}
                  </Text>
                </View>
              )
            }
            ListHeaderComponent={
              customValue ? (
                <Pressable
                  accessibilityLabel={`Use ${customValue}`}
                  accessibilityRole="button"
                  className="flex-row items-center border-b border-slate-100 px-4 py-3 active:bg-slate-50"
                  onPress={() => choose(customValue)}
                >
                  <MaterialCommunityIcons
                    color="#4C45F5"
                    name="pencil-outline"
                    size={18}
                  />
                  <Text className="ml-2 flex-1 text-sm font-semibold text-[#4C45F5]">
                    Use “{customValue}”
                  </Text>
                </Pressable>
              ) : undefined
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityLabel={item.label}
                accessibilityRole="button"
                className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3 active:bg-slate-50"
                onPress={() => choose(item.label)}
              >
                <Text className="flex-1 pr-3 text-sm text-slate-800">
                  {item.label}
                </Text>
                {item.hint ? (
                  <Text className="text-xs text-slate-400">{item.hint}</Text>
                ) : null}
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
