import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type PropertySummaryStatProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  accent?: boolean;
};

export function PropertySummaryStat({
  icon,
  label,
  value,
  accent = false,
}: PropertySummaryStatProps) {
  return (
    <View style={styles.summaryStat}>
      <View style={styles.statLabelRow}>
        <MaterialCommunityIcons
          name={icon}
          size={13}
          color={accent ? "#FFD34E" : "#9FA9DE"}
        />
        <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>
          {label}
        </Text>
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
  statLabel: { color: "#B8C2E7", fontSize: 10, fontWeight: "600" },
  statLabelAccent: { color: "#FFE15F" },
  statValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", marginTop: 5 },
});
