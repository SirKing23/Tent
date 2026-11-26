import { Image, Text, View } from "react-native";

import { resolvePhotoUri } from "../../../services/photoStorage";

/**
 * Circular account avatar: the saved profile photo when one exists, otherwise
 * the user's initials on the brand emerald background.
 */
export function ProfileAvatar({
  photo,
  initials,
  size = 48,
}: {
  photo?: string | null;
  initials: string;
  size?: number;
}) {
  const uri = resolvePhotoUri(photo);
  const radius = size / 2;

  if (uri) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full bg-emerald-600"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <Text
        className="font-bold text-white"
        style={{ fontSize: Math.round(size * 0.33) }}
      >
        {initials}
      </Text>
    </View>
  );
}
