import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type PropertySummaryStatTone = "default" | "positive" | "info";

const TONES: Record<PropertySummaryStatTone, { icon: string; label: string }> =
  {
    default: { icon: "#9FA9DE", label: "#B8C2E7" },
    positive: { icon: "#6EE7B7", label: "#A7F3D0" },
    info: { icon: "#60A5FA", label: "#BFDBFE" },
  };

type PropertySummaryStatProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  tone?: PropertySummaryStatTone;
};

export function PropertySummaryStat({
  icon,
  label,
  value,
  tone = "default",
}: PropertySummaryStatProps) {
  const colors = TONES[tone];

  return (
    <View style={styles.summaryStat}>
      <View style={styles.statLabelRow}>
        <MaterialCommunityIcons name={icon} size={13} color={colors.icon} />
        <Text style={[styles.statLabel, { color: colors.label }]}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryStat: {
    flex: 1,
    backgroundColor: "#202852",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontSize: 10, fontWeight: "600" },
  statValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", marginTop: 5 },
});
