import Ionicons from "@react-native-vector-icons/ionicons";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import ZoomableImage from "../../../../components/ZoomableImage";
import type { GalleryAsset } from "../types";

type GalleryViewerModalProps = {
  asset: GalleryAsset | null;
  isDeleting?: boolean;
  onClose: () => void;
  onDelete: (asset: GalleryAsset) => void;
  onOpenSource: (asset: GalleryAsset) => void;
};

export function GalleryViewerModal({
  asset,
  isDeleting = false,
  onClose,
  onDelete,
  onOpenSource,
}: GalleryViewerModalProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      visible={Boolean(asset)}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-slate-950">
          <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
          <View className="flex-row items-center px-4 py-2">
            <View className="flex-1 pr-3">
              <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-emerald-400">
                {asset?.tag}
              </Text>
              <Text
                className="mt-0.5 text-sm font-semibold text-white"
                numberOfLines={1}
              >
                {asset?.title}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close photo"
              accessibilityRole="button"
              className="h-11 w-11 items-center justify-center rounded-full bg-white/15 active:opacity-70"
              onPress={onClose}
            >
              <Ionicons color="#fff" name="close" size={24} />
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center">
            {asset ? <ZoomableImage uri={asset.uri} /> : null}
          </View>

          <View
            className="rounded-t-3xl bg-white"
            style={{ maxHeight: "62%" }}
          >
            <View className="items-center pt-2.5">
              <View className="h-1 w-10 rounded-full bg-slate-200" />
            </View>

            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 14,
                paddingBottom: 12,
              }}
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
            >
              <Text className="text-lg font-bold text-slate-900">
                {asset?.title}
              </Text>
              {asset?.subtitle ? (
                <Text className="mt-1 text-sm text-slate-500">
                  {asset.subtitle}
                </Text>
              ) : null}

              <View className="mt-4">
                {asset?.facts.map((fact) => (
                  <View
                    key={fact.label}
                    className="flex-row items-start justify-between border-b border-slate-100 py-2.5"
                  >
                    <Text className="mr-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {fact.label}
                    </Text>
                    <Text className="flex-1 text-right text-sm text-slate-800">
                      {fact.value}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View
              className="flex-row border-t border-slate-100 px-5 pb-3 pt-3"
              style={{ gap: 10 }}
            >
              {asset?.target ? (
                <Pressable
                  accessibilityLabel="Open the record that uses this photo"
                  accessibilityRole="button"
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 active:opacity-80"
                  onPress={() => onOpenSource(asset)}
                >
                  <Ionicons color="#fff" name="open-outline" size={18} />
                  <Text className="ml-2 text-sm font-bold text-white">
                    Open record
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityLabel="Delete this photo"
                accessibilityRole="button"
                className="flex-row items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 active:opacity-70"
                disabled={isDeleting}
                onPress={() => {
                  if (asset) onDelete(asset);
                }}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#E11D48" size="small" />
                ) : (
                  <>
                    <Ionicons color="#E11D48" name="trash-outline" size={18} />
                    <Text className="ml-2 text-sm font-bold text-rose-600">
                      Delete
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
