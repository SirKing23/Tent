import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Bottom padding for a bottom sheet.
 *
 * Android draws the window edge to edge, so the system navigation bar sits on
 * top of the sheet's last row unless its inset is padded out.
 */
export function getSheetBottomPadding(
  bottomInset: number,
  base = 24,
): number {
  return Math.max(base, bottomInset + 16);
}

export function useSheetBottomPadding(base = 24): number {
  const insets = useSafeAreaInsets();
  return getSheetBottomPadding(insets.bottom, base);
}
