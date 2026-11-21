import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type BillSelectFieldProps = {
  label: string;
  value: string;
  onPress: () => void;
};

export function BillSelectField({
  label,
  value,
  onPress,
}: BillSelectFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold text-slate-700">
        {label}
      </Text>
      <Pressable
        accessibilityLabel={`Select ${label}`}
        className="min-h-12 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3"
        onPress={onPress}
      >
        <Text className="flex-1 text-sm text-slate-900">{value}</Text>
        <MaterialCommunityIcons name="chevron-down" size={22} color="#475569" />
      </Pressable>
    </View>
  );
}
