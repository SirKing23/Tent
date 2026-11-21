import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

import { formatDateShort } from "../../../utils/date";

export function PaymentChip({
  paidAt,
  onPress,
}: {
  paidAt: string | undefined;
  onPress: () => void;
}) {
  const paid = Boolean(paidAt);

  return (
    <Pressable
      accessibilityLabel={paid ? "Edit payment" : "Mark as paid"}
      className={`mt-1 flex-row items-center self-end rounded-full px-2.5 py-0.5 ${
        paid ? "bg-[#e3f8f0]" : "border border-[#dfe7f0] bg-white"
      }`}
      hitSlop={6}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
    >
      <MaterialCommunityIcons
        color={paid ? "#047857" : "#4C45F5"}
        name={paid ? "check-circle" : "cash"}
        size={12}
      />
      <Text
        className={`ml-1 text-[10px] font-bold ${
          paid ? "text-[#047857]" : "text-[#4C45F5]"
        }`}
      >
        {paid ? `Paid ${formatDateShort(paidAt as string)}` : "Mark paid"}
      </Text>
    </Pressable>
  );
}
