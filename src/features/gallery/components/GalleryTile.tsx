import Ionicons from "@react-native-vector-icons/ionicons";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { GalleryAsset } from "../types";

type GalleryTileProps = {
  asset: GalleryAsset;
  size: number;
  onPress: (asset: GalleryAsset) => void;
};

/**
 * One square grid tile.
 *
 * The outer `Pressable` is deliberately left unstyled: on some Android builds
 * a styled `Pressable` renders at zero size, which made every tile invisible.
 * All sizing therefore lives on a plain `View` with explicit pixel dimensions.
 */
export function GalleryTile({ asset, size, onPress }: GalleryTileProps) {
  const [failed, setFailed] = useState(false);

  return (
    <Pressable
      accessibilityLabel={`${asset.tag}: ${asset.title}`}
      accessibilityRole="button"
      onPress={() => onPress(asset)}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.frame,
            { height: size, opacity: pressed ? 0.82 : 1, width: size },
          ]}
        >
          {failed ? (
            <View style={styles.fallback}>
              <Ionicons color="#94A3B8" name="image-outline" size={26} />
              <Text style={styles.fallbackText}>Unavailable</Text>
            </View>
          ) : (
            <Image
              onError={() => {
                console.warn("Gallery photo failed to load:", asset.uri);
                setFailed(true);
              }}
              resizeMode="cover"
              source={{ uri: asset.uri }}
              style={{ height: size, width: size }}
            />
          )}

          <View style={styles.tag}>
            <Text numberOfLines={1} style={styles.tagText}>
              {asset.tag}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    overflow: "hidden",
  },
  fallback: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  fallbackText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  tag: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    bottom: 6,
    left: 6,
    maxWidth: "88%",
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: "absolute",
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
});
