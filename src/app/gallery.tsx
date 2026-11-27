import Ionicons from "@react-native-vector-icons/ionicons";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GalleryTile } from "../features/gallery/components/GalleryTile";
import { GalleryViewerModal } from "../features/gallery/components/GalleryViewerModal";
import { useGallery } from "../features/gallery/hooks/useGallery";
import {
  getGalleryTileSize,
  groupGalleryAssets,
} from "../features/gallery/logic/gallery";
import type { GalleryAsset } from "../features/gallery/types";

const COLUMNS = 3;
const GRID_GAP = 8;
const GRID_PADDING = 16;

export default function GalleryScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { assets, isLoading, isRefreshing, refresh, remove } = useGallery();
  const [viewer, setViewer] = useState<GalleryAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tiles get an explicit size: `aspectRatio` + percentage widths inside a row
  // collapse to zero height on native, which hides every photo.
  const tileSize = getGalleryTileSize(
    Number.isFinite(windowWidth) && windowWidth > 0 ? windowWidth : 375,
    { columns: COLUMNS, gap: GRID_GAP, padding: GRID_PADDING },
  );

  const sections = useMemo(() => groupGalleryAssets(assets), [assets]);

  const openSource = (asset: GalleryAsset) => {
    const target = asset.target;
    if (!target) return;
    setViewer(null);

    switch (target.kind) {
      case "property":
        router.push({
          pathname: "/properties-summary",
          params: { id: target.propertyId },
        });
        return;
      case "tenants":
        router.push("/tenants-inbox");
        return;
      case "cashbook":
        router.push({
          pathname: "/cashbook-Inbox",
          params: { id: target.cashbookId },
        });
        return;
      case "billing":
        if (target.buildingId) {
          router.push({
            pathname: "/monthlyBilling-units",
            params: { buildingId: target.buildingId, period: target.period },
          });
          return;
        }
        router.push({
          pathname: "/monthlyBillings",
          params: {
            period: target.period,
            ...(target.unitId
              ? {
                  highlightUnitId: target.unitId,
                  highlightToken: String(Date.now()),
                }
              : {}),
          },
        });
        return;
    }
  };

  const confirmDelete = async (asset: GalleryAsset) => {
    setIsDeleting(true);
    try {
      await remove(asset);
      setViewer(null);
    } catch (error) {
      console.error("Unable to delete gallery photo:", error);
      Alert.alert("Couldn't delete photo", "Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const requestDelete = (asset: GalleryAsset) => {
    Alert.alert(
      "Delete photo?",
      "It will be removed from the record that uses it and from this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void confirmDelete(asset),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "Gallery" }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#059669" size="large" />
          <Text className="mt-3 text-sm text-slate-500">
            Collecting your photos…
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              colors={["#059669"]}
              onRefresh={() => void refresh()}
              refreshing={isRefreshing}
              tintColor="#059669"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {assets.length ? (
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-slate-700">
                {assets.length} photo{assets.length === 1 ? "" : "s"}
              </Text>
              <Text className="text-xs text-slate-400">Newest first</Text>
            </View>
          ) : (
            <View className="items-center px-8 pb-16 pt-24">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                <Ionicons color="#059669" name="images-outline" size={30} />
              </View>
              <Text className="mt-4 text-base font-bold text-slate-900">
                No photos yet
              </Text>
              <Text className="mt-1.5 text-center text-sm leading-5 text-slate-500">
                Photos you add to properties, tenants, cashbooks and monthly
                bills will be collected here, newest first.
              </Text>
            </View>
          )}

          {sections.map((section) => (
            <View key={section.key}>
              <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-[1.5px] text-slate-400">
                {section.title}
              </Text>
              <View style={styles.grid}>
                {section.assets.map((asset) => (
                  <GalleryTile
                    key={asset.key}
                    asset={asset}
                    onPress={setViewer}
                    size={tileSize}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <GalleryViewerModal
        asset={viewer}
        isDeleting={isDeleting}
        onClose={() => setViewer(null)}
        onDelete={requestDelete}
        onOpenSource={openSource}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: GRID_PADDING,
    paddingBottom: 36,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
});
