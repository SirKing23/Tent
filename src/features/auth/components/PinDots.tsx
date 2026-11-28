import { View } from "react-native";

import { PIN_LENGTH } from "../logic/pinValidation";

export function PinDots({
  filled,
  length = PIN_LENGTH,
  hasError = false,
}: {
  filled: number;
  length?: number;
  hasError?: boolean;
}) {
  const activeClassName = hasError
    ? "border-red-500 bg-red-500"
    : "border-emerald-600 bg-emerald-600";

  return (
    <View
      accessibilityLabel={`${filled} of ${length} PIN digits entered`}
      className="flex-row justify-center"
    >
      {Array.from({ length }).map((_, index) => (
        <View
          key={index}
          className={`mx-2 h-3.5 w-3.5 rounded-full border-2 ${
            index < filled ? activeClassName : "border-slate-300 bg-white"
          }`}
        />
      ))}
    </View>
  );
}
