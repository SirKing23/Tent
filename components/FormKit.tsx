import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

/** Shared screen scaffolding so single-page forms match the property form. */
export const formScreenStyles = StyleSheet.create({
  safe: { backgroundColor: "#f7f9fc", flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  bottomSpacer: { height: 24 },
});

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

type FieldInputKeyboardType =
  | "default"
  | "numeric"
  | "phone-pad"
  | "email-address"
  | "decimal-pad"
  | "number-pad";

export function FieldInput({
  label,
  placeholder,
  value,
  onChangeText,
  optional = false,
  keyboardType = "default",
  editable = true,
  multiline = false,
  maxLength,
  hint,
  autoCapitalize = "words",
  onLayout,
  onFocus,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  optional?: boolean;
  keyboardType?: FieldInputKeyboardType;
  editable?: boolean;
  multiline?: boolean;
  maxLength?: number;
  hint?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
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
        autoCapitalize={autoCapitalize}
        editable={editable}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor="#96a4b7"
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          !editable && styles.inputLocked,
        ]}
        value={value}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function SelectField({
  label,
  value,
  placeholder,
  icon = "chevron-down",
  disabled = false,
  children,
  onLayout,
  onPress,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  children?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  onPress: () => void;
}) {
  const hasValue = Boolean(value);
  return (
    <View onLayout={onLayout} style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityLabel={`Select ${label}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[styles.select, disabled && styles.inputLocked]}
      >
        <Text
          numberOfLines={1}
          style={hasValue ? styles.selectText : styles.placeholder}
        >
          {hasValue ? value : (placeholder ?? "Select")}
        </Text>
        <Ionicons
          color={disabled ? "#96a4b7" : "#526986"}
          name={icon}
          size={16}
        />
      </Pressable>
      {children}
    </View>
  );
}

export function FormFooter({
  onCancel,
  cancelLabel = "Cancel",
  cancelDisabled = false,
  onSubmit,
  submitLabel,
  submittingLabel = "Saving…",
  submitIcon = "checkmark",
  isSubmitting = false,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  /** Dims the secondary button, for the first wizard step. */
  cancelDisabled?: boolean;
  onSubmit: () => void;
  submitLabel: string;
  submittingLabel?: string;
  submitIcon?: keyof typeof Ionicons.glyphMap;
  isSubmitting?: boolean;
}) {
  return (
    <View style={styles.nav}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: cancelDisabled }}
        disabled={isSubmitting || cancelDisabled}
        onPress={onCancel}
        style={[styles.navBtn, styles.navBack, cancelDisabled && styles.disabled]}
      >
        <Ionicons color="#334155" name="arrow-back" size={18} />
        <Text style={styles.navBackText}>{cancelLabel}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={onSubmit}
        style={[
          styles.navBtn,
          styles.navNext,
          isSubmitting && styles.disabled,
        ]}
      >
        <Text style={styles.navNextText}>
          {isSubmitting ? submittingLabel : submitLabel}
        </Text>
        <Ionicons color="#fff" name={submitIcon} size={18} />
      </Pressable>
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
  hint: { color: "#8b9bb0", fontSize: 11, marginTop: 4 },
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
  inputMultiline: {
    minHeight: 88,
    paddingTop: 11,
    textAlignVertical: "top",
  },
  inputLocked: {
    backgroundColor: "#f0f4f9",
    borderColor: "#dfe7f0",
    color: "#7890ae",
  },
  select: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#dfe7f0",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 45,
    paddingHorizontal: 13,
  },
  selectText: { color: "#1b2e49", flex: 1, fontSize: 14, marginRight: 10 },
  placeholder: { color: "#96a4b7", flex: 1, fontSize: 14, marginRight: 10 },
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

  nav: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: 16,
    gap: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e4eaf2",
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  navBack: {
    borderWidth: 1,
    borderColor: "#dfe7f0",
    backgroundColor: "#f7f9fc",
  },
  navBackText: { color: "#334155", fontSize: 14, fontWeight: "700" },
  navNext: { flex: 1, justifyContent: "center", backgroundColor: "#5041df" },
  navNextText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
