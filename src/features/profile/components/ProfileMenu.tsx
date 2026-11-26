import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, type ComponentProps } from "react";
import {
  BackHandler,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MENU_WIDTH = 236;
const EDGE_MARGIN = 16;
const ANCHOR_GAP = 12;
// Header metrics: 12pt top padding + 48pt avatar, measured from the safe area.
const HEADER_AVATAR_BOTTOM = 12 + 48;

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type ProfileMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ProfileMenuItem = {
  id: string;
  label: string;
  description?: string;
  icon: MaterialIconName;
  onPress: () => void;
};

/**
 * Places the dropdown under its anchor and keeps it inside the window. `minTop`
 * is the lowest position that still clears the header avatar, so the menu can
 * never pop on top of the profile picture.
 */
export function getProfileMenuPosition(
  anchor: ProfileMenuAnchor | null,
  windowWidth: number,
  minTop: number,
): { left: number; top: number } {
  const measured =
    anchor && Number.isFinite(anchor.y) && Number.isFinite(anchor.height)
      ? anchor
      : null;

  const left = Math.min(
    Math.max(measured?.x ?? EDGE_MARGIN, EDGE_MARGIN),
    Math.max(EDGE_MARGIN, windowWidth - MENU_WIDTH - EDGE_MARGIN),
  );
  const measuredTop = measured
    ? measured.y + measured.height + ANCHOR_GAP
    : minTop;

  return { left, top: Math.max(measuredTop, minTop) };
}

/** Dropdown anchored to the home-page avatar with account shortcuts. */
export function ProfileMenu({
  anchor,
  items,
  onClose,
  visible,
}: {
  anchor: ProfileMenuAnchor | null;
  items: ProfileMenuItem[];
  onClose: () => void;
  visible: boolean;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Android's back button dismisses the dropdown instead of leaving the tab.
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onClose, visible]);

  if (!visible) return null;

  const { left, top } = getProfileMenuPosition(
    anchor,
    windowWidth,
    insets.top + HEADER_AVATAR_BOTTOM + ANCHOR_GAP,
  );

  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      <Pressable
        accessibilityLabel="Close account menu"
        accessibilityRole="button"
        className="absolute inset-0"
        onPress={onClose}
      />
      <View
        className="absolute rounded-2xl border border-slate-200 bg-white py-1.5"
        style={[
          { left, top, width: MENU_WIDTH },
          {
            elevation: 12,
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.16,
            shadowRadius: 18,
          },
        ]}
      >
        {items.map((item, index) => (
          <View key={item.id}>
            {index > 0 ? <View className="mx-3 h-px bg-slate-100" /> : null}
            <Pressable
              accessibilityLabel={
                item.description
                  ? `${item.label}. ${item.description}`
                  : item.label
              }
              accessibilityRole="button"
              className="flex-row items-center px-3 py-2.5 active:bg-slate-50"
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                <MaterialCommunityIcons
                  color="#059669"
                  name={item.icon}
                  size={18}
                />
              </View>
              <View className="ml-2.5 min-w-0 flex-1">
                <Text
                  className="text-[13px] font-semibold text-slate-900"
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {item.description ? (
                  <Text
                    className="mt-0.5 text-[10px] leading-4 text-slate-500"
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
