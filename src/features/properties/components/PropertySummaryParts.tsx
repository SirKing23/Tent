import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@react-native-vector-icons/ionicons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function PropertySummaryMeta({
  icon,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons color="#8b9bb0" name={icon} size={15} />
      <Text numberOfLines={1} style={styles.statText}>
        {label}
      </Text>
    </View>
  );
}

export function PropertySummaryTab({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Ionicons color={active ? "#fff" : "#526986"} name={icon} size={16} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function PropertySummarySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function PropertySummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { alignItems: "center", flex: 1, flexDirection: "row", gap: 5 },
  statText: { color: "#526986", flex: 1, fontSize: 11, fontWeight: "600" },
  tab: {
    alignItems: "center",
    borderRadius: 13,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 9,
  },
  tabActive: { backgroundColor: "#5041df" },
  tabText: { color: "#526986", fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: "#fff" },
  section: { paddingVertical: 4 },
  sectionTitle: {
    color: "#5041df",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  rowLabel: { color: "#637b99", flex: 1, fontSize: 13 },
  rowValue: {
    color: "#0d162a",
    flex: 2,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
});
