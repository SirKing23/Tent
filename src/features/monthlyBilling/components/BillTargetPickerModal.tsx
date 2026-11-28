import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { useSheetBottomPadding } from "../../../hooks/useSheetInsets";
import { getPropertyAddress } from "../../properties/logic/propertyRules";
import type { Property } from "../../properties/types";
import { formatPeriodLabel } from "../../../utils/period";

type BillTargetPickerModalProps = {
  visible: boolean;
  period: string;
  properties: readonly Property[];
  onClose: () => void;
  onSelect: (property: Property) => void;
};

function PropertyTargetRow({
  property,
  parentName,
  onPress,
}: {
  property: Property;
  parentName?: string;
  onPress: () => void;
}) {
  const isUnit = property.type === "Unit";
  const detail = isUnit
    ? parentName
      ? `Unit in ${parentName}`
      : "Standalone unit"
    : getPropertyAddress(property) || "No address added";

  return (
    <Pressable
      accessibilityLabel={`Add bill to ${property.name}`}
      className="mb-2 flex-row items-center rounded-2xl border border-[#e4eaf2] bg-white p-3 active:opacity-70"
      onPress={onPress}
    >
      <View
        className={`mr-3 h-10 w-10 items-center justify-center rounded-[13px] ${
          isUnit ? "bg-[#E0F7FA]" : "bg-[#EBECFF]"
        }`}
      >
        <MaterialCommunityIcons
          color={isUnit ? "#0891B2" : "#4C45F5"}
          name={isUnit ? "door-open" : "office-building-outline"}
          size={21}
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className="text-[14px] font-extrabold text-[#0d162a]"
          numberOfLines={1}
        >
          {property.name}
        </Text>
        <Text className="text-[11px] text-[#7c8ba1]" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <MaterialCommunityIcons color="#94A3B8" name="chevron-right" size={20} />
    </Pressable>
  );
}

export function BillTargetPickerModal({
  visible,
  period,
  properties,
  onClose,
  onSelect,
}: BillTargetPickerModalProps) {
  const buildings = properties.filter(
    (property) => property.type === "Building",
  );
  const units = properties.filter((property) => property.type === "Unit");
  const sheetBottomPadding = useSheetBottomPadding(32);
  const buildingNames = new Map(
    buildings.map((building) => [building.id, building.name]),
  );

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          accessibilityLabel="Close property picker"
          className="flex-1"
          onPress={onClose}
        />
        <View
          className="max-h-[82%] rounded-t-3xl bg-white px-5 pt-5"
          style={{ paddingBottom: sheetBottomPadding }}
        >
          <View className="mb-1 flex-row items-center justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-lg font-extrabold text-slate-900">
                Add a bill
              </Text>
              <Text className="mt-0.5 text-[12px] text-slate-500">
                Choose the property for {formatPeriodLabel(period)}.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close property picker"
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              onPress={onClose}
            >
              <MaterialCommunityIcons
                color="#475569"
                name="close"
                size={20}
              />
            </Pressable>
          </View>

          <Text className="mb-3 mt-1 text-[11px] leading-4 text-[#7c8ba1]">
            This bill is a one-off entry. It will not appear in other months.
          </Text>

          {properties.length === 0 ? (
            <Text className="py-8 text-center text-[12px] text-[#8b9bb0]">
              No properties available. Add a property first.
            </Text>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              {buildings.length > 0 ? (
                <>
                  <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
                    Buildings
                  </Text>
                  {buildings.map((property) => (
                    <PropertyTargetRow
                      key={property.id}
                      property={property}
                      onPress={() => onSelect(property)}
                    />
                  ))}
                </>
              ) : null}

              {units.length > 0 ? (
                <>
                  <Text className="mb-2 mt-2 text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
                    Units
                  </Text>
                  {units.map((property) => (
                    <PropertyTargetRow
                      key={property.id}
                      parentName={
                        property.parentBuildingId
                          ? buildingNames.get(property.parentBuildingId)
                          : undefined
                      }
                      property={property}
                      onPress={() => onSelect(property)}
                    />
                  ))}
                </>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
