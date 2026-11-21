import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

import { resolvePhotoUri } from "../../../services/photoStorage";
import { formatDateShort } from "../../../utils/date";
import { getDescriptionPreview } from "../../../utils/text";
import { formatEntryAmount } from "../logic/cashbookCalculations";
import type { CashbookEntry } from "../types";

type CashbookEntryRowProps = {
  entry: CashbookEntry;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onImagePress: () => void;
  onAddImagePress: () => void;
};

export function CashbookEntryRow({
  entry,
  selected,
  onPress,
  onLongPress,
  onImagePress,
  onAddImagePress,
}: CashbookEntryRowProps) {
  const isCashOut = entry.type === "cashOut";

  return (
    <Pressable
      className={`mx-3 mb-1 h-[78px] flex-row items-center overflow-hidden rounded-lg border ${selected ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"}`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      {selected ? (
        <View className="mr-3 h-[78px] w-[78px] items-center justify-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-teal-700">
            <MaterialCommunityIcons name="check" size={23} color="#FFFFFF" />
          </View>
        </View>
      ) : entry.imageUri ? (
        <Pressable
          accessibilityLabel="View entry image"
          className="mr-3 h-[78px] w-[78px]"
          onPress={onImagePress}
          onLongPress={onLongPress}
          delayLongPress={300}
        >
          <Image
            source={{ uri: resolvePhotoUri(entry.imageUri) ?? entry.imageUri }}
            className="h-full w-full"
            resizeMode="cover"
          />
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel="Add image to entry"
          className={`mr-3 h-[78px] w-[78px] items-center justify-center ${isCashOut ? "bg-rose-50" : "bg-emerald-50"}`}
          onPress={onAddImagePress}
          onLongPress={onLongPress}
          delayLongPress={300}
        >
          <MaterialCommunityIcons
            name={isCashOut ? "arrow-top-right" : "arrow-bottom-left"}
            size={22}
            color={isCashOut ? "#DC2626" : "#047857"}
          />
        </Pressable>
      )}
      <View className="min-w-0 flex-1 pr-2">
        <View className="flex-row items-center">
          <Text
            className="min-w-0 flex-1 text-base font-bold text-slate-900"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {entry.description || (isCashOut ? "Cash out" : "Cash in")}
          </Text>
          <Text
            className="ml-2 w-[58px] text-right text-xs text-slate-800"
            numberOfLines={1}
          >
            {formatDateShort(entry.date)} •
          </Text>
        </View>
        <Text
          className={`w-[130px] shrink text-left text-sm font-bold ${isCashOut ? "text-rose-600" : "text-emerald-700"}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {formatEntryAmount(entry)}
        </Text>
        <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={1}>
          {getDescriptionPreview(entry.paymentMode)} ·{" "}
          {isCashOut ? "Cash out" : "Cash in"}
        </Text>
      </View>
    </Pressable>
  );
}
