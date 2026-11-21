import { Text, View } from "react-native";

export function TenantSummaryCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <View className="min-h-[83px] flex-1 rounded-[16px] border border-[#e4eaf2] bg-white px-[13px] py-[18px]">
      <Text className="mb-[8px] text-[12px] text-[#526986]">{label}</Text>
      <Text className={`text-[21px] font-extrabold ${colorClass}`}>
        {value}
      </Text>
    </View>
  );
}
