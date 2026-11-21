import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { LayoutChangeEvent } from "react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function FieldInput({
  label,
  placeholder,
  value,
  onChangeText,
  optional = false,
  keyboardType = "default",
  editable = true,
  onLayout,
  onFocus,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  optional?: boolean;
  keyboardType?: "default" | "numeric" | "phone-pad" | "email-address";
  editable?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  onFocus?: () => void;
}) {
  return (
    <View onLayout={onLayout} style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      <TextInput
        autoCapitalize="words"
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor="#96a4b7"
        style={[styles.input, !editable && styles.inputLocked]}
        value={value}
      />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons color="#2563EB" name={icon} size={36} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { marginBottom: 20 },
  eyebrow: {
    color: "#637b99",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: { color: "#0d162a", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#637b99", fontSize: 13, marginTop: 3 },
  field: { marginBottom: 14 },
  label: {
    color: "#29466c",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  optional: { color: "#8b9bb0", fontWeight: "400" },
  input: {
    backgroundColor: "#fff",
    borderColor: "#dfe7f0",
    borderRadius: 13,
    borderWidth: 1,
    color: "#1b2e49",
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  inputLocked: {
    backgroundColor: "#f0f4f9",
    borderColor: "#dfe7f0",
    color: "#7890ae",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0d162a",
    marginBottom: 6,
  },
  emptySubtitle: { fontSize: 13, color: "#637b99", textAlign: "center" },
});
