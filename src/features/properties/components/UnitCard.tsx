import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Image, Pressable, Text, View } from "react-native";

import { resolvePhotoUri } from "../../../services/photoStorage";
import { pluralize } from "../../../utils/text";
import {
  getPropertyAddress,
  type PropertyOccupancy,
} from "../logic/propertyRules";
import type { Property } from "../types";
import { PROPERTY_OCCUPANCY_STYLES } from "./occupancyStyles";

type UnitCardProps = {
  unit: Property;
  occupancy?: PropertyOccupancy;
  onPress: () => void;
  onEdit: () => void;
};

export function UnitCard({ unit, occupancy, onPress, onEdit }: UnitCardProps) {
  const address = getPropertyAddress(unit);
  const cover = unit.photos?.[0];
  const photoCount = unit.photos?.length ?? 0;
  const occupancyStyle = occupancy
    ? PROPERTY_OCCUPANCY_STYLES[occupancy]
    : null;

  return (
    <Pressable
      className="rounded-[24px] border border-l-[3px] border-[#e4eaf2] bg-white p-[16px]"
      onPress={onPress}
      style={
        occupancyStyle ? { borderLeftColor: occupancyStyle.border } : undefined
      }
    >
      <View className="flex-row items-center">
        {cover ? (
          <Image
            className="h-[48px] w-[48px] rounded-[15px]"
            source={{ uri: resolvePhotoUri(cover) ?? cover }}
          />
        ) : (
          <View className="h-[48px] w-[48px] items-center justify-center rounded-[15px] bg-[#0891b2]">
            <MaterialCommunityIcons color="#fff" name="door-open" size={22} />
          </View>
        )}
        <View className="ml-[12px] min-w-0 flex-1">
          <Text
            className="mb-[5px] text-[15px] font-extrabold text-[#101a2e]"
            numberOfLines={1}
          >
            {unit.name}
          </Text>
          <View className="mb-[3px] flex-row items-center gap-[7px]">
            <View className="rounded-[10px] bg-[#E0F7FA] px-[8px] py-[3px]">
              <Text className="text-[10px] font-extrabold text-[#0891B2]">
                {unit.type}
              </Text>
            </View>
            {occupancyStyle ? (
              <View
                className={`rounded-[10px] px-[8px] py-[3px] ${occupancyStyle.pill}`}
              >
                <Text
                  className={`text-[10px] font-extrabold ${occupancyStyle.pillText}`}
                >
                  {occupancyStyle.label}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            className="mb-[3px] text-[12px] text-[#526986]"
            numberOfLines={1}
          >
            {address || "No address added"}
          </Text>
          <Text className="text-[11px] text-[#8495aa]" numberOfLines={1}>
            {photoCount ? pluralize(photoCount, "photo") : "No photos added"}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Edit unit"
          className="ml-[7px] h-[34px] w-[34px] items-center justify-center rounded-[14px] bg-[#f1f5f9]"
          onPress={onEdit}
        >
          <Ionicons color="#22324a" name="create-outline" size={17} />
        </Pressable>
      </View>

      <View className="mt-[14px] flex-row items-center border-t border-t-[#edf1f6] pt-[12px]">
        <View className="flex-1 flex-row items-center gap-[5px]">
          <MaterialCommunityIcons
            color="#A86406"
            name="receipt-text-outline"
            size={15}
          />
          <Text
            className="flex-1 text-[11px] text-[#526986]"
            numberOfLines={1}
          >
            {pluralize(unit.billIds.length, "Bill")}
          </Text>
        </View>
        <View className="flex-1 flex-row items-center gap-[5px]">
          <MaterialCommunityIcons
            color="#2F5688"
            name="account-outline"
            size={15}
          />
          <Text
            className="flex-1 text-[11px] text-[#526986]"
            numberOfLines={1}
          >
            {pluralize(unit.tenantIds.length, "Tenant")}
          </Text>
        </View>
        <MaterialCommunityIcons color="#2F5688" name="chevron-right" size={18} />
      </View>
    </Pressable>
  );
}
