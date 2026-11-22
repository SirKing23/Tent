import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { formatDateShort } from "../../../utils/date";

/** Read-only paid marker; payment details are edited inside the utility dialog. */
export function PaymentStatus({ paidAt }: { paidAt: string | undefined }) {
  if (!paidAt) return null;

  return (
    <View className="mt-1 flex-row items-center self-end rounded-full bg-[#e3f8f0] px-2.5 py-0.5">
      <MaterialCommunityIcons color="#047857" name="check-circle" size={11} />
      <Text className="ml-1 text-[10px] font-bold text-[#047857]">
        Paid {formatDateShort(paidAt)}
      </Text>
    </View>
  );
}
