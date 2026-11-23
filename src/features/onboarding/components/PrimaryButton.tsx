import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  variant?: "primary" | "secondary";
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  variant = "primary",
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`h-14 flex-row items-center justify-center rounded-2xl active:opacity-80 ${
        isPrimary
          ? "bg-emerald-600"
          : "border border-slate-200 bg-white"
      }`}
      disabled={isDisabled}
      onPress={onPress}
      style={{ opacity: isDisabled ? 0.55 : 1 }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#FFFFFF" : "#059669"} />
      ) : (
        <>
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={isPrimary ? "#FFFFFF" : "#0F172A"}
            />
          ) : null}
          <Text
            className={`text-base font-semibold ${
              icon ? "ml-2" : ""
            } ${isPrimary ? "text-white" : "text-slate-900"}`}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
