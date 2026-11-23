import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

function KeyButton({
  label,
  icon,
  accessibilityLabel,
  onPress,
  disabled,
}: {
  label?: string;
  icon?: IconName;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      className="mx-1.5 h-16 w-20 items-center justify-center rounded-2xl active:bg-slate-100"
      disabled={disabled}
      onPress={onPress}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      {label ? (
        <Text className="text-2xl font-semibold text-slate-900">{label}</Text>
      ) : icon ? (
        <MaterialCommunityIcons name={icon} size={24} color="#475569" />
      ) : null}
    </Pressable>
  );
}

export function PinKeypad({
  onDigit,
  onBackspace,
  onBiometric,
  biometricLabel = "Unlock with biometrics",
  showBiometric = false,
  disabled = false,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onBiometric?: () => void;
  biometricLabel?: string;
  showBiometric?: boolean;
  disabled?: boolean;
}) {
  return (
    <View className="items-center">
      {ROWS.map((row) => (
        <View key={row.join("")} className="mb-2 flex-row justify-center">
          {row.map((digit) => (
            <KeyButton
              key={digit}
              disabled={disabled}
              label={digit}
              onPress={() => onDigit(digit)}
            />
          ))}
        </View>
      ))}
      <View className="flex-row justify-center">
        {showBiometric && onBiometric ? (
          <KeyButton
            accessibilityLabel={biometricLabel}
            disabled={disabled}
            icon="fingerprint"
            onPress={onBiometric}
          />
        ) : (
          <View className="mx-1.5 h-16 w-20" />
        )}
        <KeyButton
          disabled={disabled}
          label="0"
          onPress={() => onDigit("0")}
        />
        <KeyButton
          accessibilityLabel="Delete last digit"
          disabled={disabled}
          icon="backspace-outline"
          onPress={onBackspace}
        />
      </View>
    </View>
  );
}
