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

type PropertyListCardProps = {
  property: Property;
  selected: boolean;
  occupancy?: PropertyOccupancy;
  parent?: Property;
  unitCount?: number;
  onPress: () => void;
  onLongPress: () => void;
  onEdit: () => void;
  onOpenUnits: () => void;
};

export function PropertyListCard({
  property,
  selected,
  occupancy,
  parent,
  unitCount = 0,
  onPress,
  onLongPress,
  onEdit,
  onOpenUnits,
}: PropertyListCardProps) {
  const address = getPropertyAddress(property);
  const isUnit = property.type === "Unit";
  const cover = property.photos?.[0];
  const photoCount = property.photos?.length ?? 0;
  const parentCover = parent?.photos?.[0];
  const occupancyStyle = occupancy
    ? PROPERTY_OCCUPANCY_STYLES[occupancy]
    : null;

  // Unit cards point back at the building they belong to.
  const parentLabel = parent
    ? parent.name
    : property.parentBuildingId
      ? "Parent building removed"
      : "No parent building";

  return (
    <Pressable
      className={`rounded-[24px] border border-l-[3px] p-[16px] ${
        selected ? "border-[#99dfd1] bg-[#eefbf8]" : "border-[#e4eaf2] bg-white"
      }`}
      delayLongPress={300}
      onLongPress={onLongPress}
      onPress={onPress}
      style={
        occupancyStyle ? { borderLeftColor: occupancyStyle.border } : undefined
      }
    >
      <View className="flex-row items-center">
        {selected ? (
          <View className="h-[48px] w-[48px] items-center justify-center rounded-[24px] bg-[#0f766e]">
            <Ionicons color="#fff" name="checkmark" size={18} />
          </View>
        ) : cover ? (
          <Image
            className="h-[48px] w-[48px] rounded-[15px]"
            source={{ uri: resolvePhotoUri(cover) ?? cover }}
          />
        ) : (
          <View
            className={`h-[48px] w-[48px] items-center justify-center rounded-[15px] ${
              isUnit ? "bg-[#0891b2]" : "bg-[#6548ee]"
            }`}
          >
            <MaterialCommunityIcons
              color="#fff"
              name={isUnit ? "door-open" : "office-building-outline"}
              size={22}
            />
          </View>
        )}
        <View className="ml-[12px] min-w-0 flex-1">
          <Text
            className="mb-[5px] text-[15px] font-extrabold text-[#101a2e]"
            numberOfLines={1}
          >
            {property.name}
          </Text>
          <View className="mb-[3px] flex-row items-center gap-[7px]">
            <View
              className={`rounded-[10px] px-[8px] py-[3px] ${
                isUnit ? "bg-[#E0F7FA]" : "bg-[#EBECFF]"
              }`}
            >
              <Text
                className={`text-[10px] font-extrabold ${
                  isUnit ? "text-[#0891B2]" : "text-[#4C45F5]"
                }`}
              >
                {property.type}
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

          {isUnit ? (
            <View className="mb-[5px] flex-row items-center self-start rounded-[10px] bg-[#f4f7fb] py-[3px] pl-[4px] pr-[8px]">
              {parentCover ? (
                <Image
                  className="h-[16px] w-[16px] rounded-[5px]"
                  source={{
                    uri: resolvePhotoUri(parentCover) ?? parentCover,
                  }}
                />
              ) : (
                <View className="h-[16px] w-[16px] items-center justify-center rounded-[5px] bg-[#e3e9f2]">
                  <MaterialCommunityIcons
                    color="#7c8ba1"
                    name="office-building-outline"
                    size={11}
                  />
                </View>
              )}
              <Text
                className={`ml-[5px] flex-shrink text-[10px] font-bold ${
                  parent ? "text-[#526986]" : "text-[#b06a2c]"
                }`}
                numberOfLines={1}
              >
                {parentLabel}
              </Text>
            </View>
          ) : null}

          <Text className="text-[11px] text-[#8495aa]" numberOfLines={1}>
            {photoCount ? pluralize(photoCount, "photo") : "No photos added"}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Edit property"
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
            {pluralize(property.billIds.length, "Bill")}
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
            {pluralize(property.tenantIds.length, "Tenant")}
          </Text>
        </View>
        {!isUnit ? (
          <Pressable
            accessibilityLabel={`View units of ${property.name}`}
            className={`flex-row items-center gap-[4px] rounded-[10px] px-[8px] py-[3px] ${
              unitCount ? "bg-[#E0F7FA]" : "bg-[#f1f5f9]"
            }`}
            hitSlop={4}
            onPress={onOpenUnits}
          >
            <MaterialCommunityIcons
              color={unitCount ? "#0891B2" : "#8495aa"}
              name="door-open"
              size={14}
            />
            <Text
              className={`text-[11px] font-extrabold ${
                unitCount ? "text-[#0891B2]" : "text-[#8495aa]"
              }`}
            >
              {pluralize(unitCount, "Unit")}
            </Text>
          </Pressable>
        ) : null}
        <MaterialCommunityIcons color="#2F5688" name="chevron-right" size={18} />
      </View>
    </Pressable>
  );
}
