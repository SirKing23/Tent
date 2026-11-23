import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

const APP_ICON = require("../assets/images/icon.png");

/**
 * Official Tent logo: the same green mark used for the launcher icon and
 * splash screen, so in-app branding and the installed app icon stay in sync.
 */
export function AppLogo({
  size = 96,
  elevated = false,
  className,
}: {
  size?: number;
  elevated?: boolean;
  className?: string;
}) {
  const radius = Math.round(size * 0.28);

  return (
    <View
      accessibilityLabel="Tent logo"
      accessibilityRole="image"
      accessible
      className={className}
      style={[
        { width: size, height: size, borderRadius: radius },
        elevated ? styles.elevated : null,
      ]}
    >
      <Image
        contentFit="cover"
        source={APP_ICON}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  elevated: {
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
});
