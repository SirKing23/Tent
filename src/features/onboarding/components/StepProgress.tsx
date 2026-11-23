import { Text, View } from "react-native";

export function StepProgress({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  return (
    <View className="flex-row items-center">
      <Text className="mr-3 text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-400">
        Step {step} of {total}
      </Text>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          className={`h-1.5 w-5 rounded-full ${
            index < step ? "bg-emerald-600" : "bg-slate-200"
          } ${index === 0 ? "" : "ml-1.5"}`}
        />
      ))}
    </View>
  );
}
