import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { formatPeriodLabel } from "../../../utils/period";
import type { BillingItem } from "../../bills/types";
import {
  getUtilityIcon,
  getUtilityIconStyle,
} from "../../bills/components/utilityIcons";
import { getPropertyAddress } from "../../properties/logic/propertyRules";
import type { Property } from "../../properties/types";
import type { PhotoTagOption } from "../logic/photoTag";
import { PeriodSwitcher } from "./PeriodSwitcher";

const entryKey = (propertyId: string, billId: string) =>
  `${propertyId}:${billId}`;

function PropertyRow({
  option,
  parentName,
  onPress,
}: {
  option: PhotoTagOption;
  parentName?: string;
  onPress: () => void;
}) {
  const isUnit = option.property.type === "Unit";
  const detail = isUnit
    ? parentName
      ? `Unit in ${parentName}`
      : "Standalone unit"
    : getPropertyAddress(option.property) || "No address added";
  const billLabel =
    option.bills.length === 1 ? "1 bill" : `${option.bills.length} bills`;

  return (
    <Pressable
      accessibilityLabel={`Tag photo to ${option.property.name}`}
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
          {option.property.name}
        </Text>
        <Text className="text-[11px] text-[#7c8ba1]" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text
        className={`mr-1 text-[10px] font-bold ${
          option.bills.length ? "text-[#4C45F5]" : "text-[#94A3B8]"
        }`}
      >
        {option.bills.length ? billLabel : "No bills"}
      </Text>
      <MaterialCommunityIcons color="#94A3B8" name="chevron-right" size={20} />
    </Pressable>
  );
}

function BillRow({
  bill,
  tagged,
  onPress,
}: {
  bill: BillingItem;
  tagged: boolean;
  onPress: () => void;
}) {
  const iconStyle = getUtilityIconStyle(bill.utilityType);

  return (
    <Pressable
      accessibilityLabel={`Tag photo to ${bill.name}`}
      className="mb-2 flex-row items-center rounded-2xl border border-[#e4eaf2] bg-white p-3 active:opacity-70"
      onPress={onPress}
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-[13px]"
        style={{ backgroundColor: iconStyle.backgroundColor }}
      >
        <MaterialCommunityIcons
          color={iconStyle.iconColor}
          name={getUtilityIcon(bill.utilityType)}
          size={21}
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className="text-[14px] font-extrabold text-[#0d162a]"
          numberOfLines={1}
        >
          {bill.name}
        </Text>
        <Text className="text-[11px] text-[#7c8ba1]" numberOfLines={1}>
          {bill.billingType}
          {bill.displayUnit ? ` · ${bill.displayUnit}` : ""}
        </Text>
      </View>
      {tagged ? (
        <View className="mr-1 flex-row items-center gap-1">
          <MaterialCommunityIcons
            color="#059669"
            name="check-circle"
            size={16}
          />
          <Text className="text-[10px] font-bold text-[#059669]">Recorded</Text>
        </View>
      ) : null}
      <MaterialCommunityIcons color="#94A3B8" name="chevron-right" size={20} />
    </Pressable>
  );
}

/**
 * Bottom sheet that walks the user from the captured photo to the bill entry
 * it belongs to: month, then property, then one of that property's bills.
 */
export function BillPhotoTagSheet({
  photoUri,
  period,
  onChangePeriod,
  options,
  selected,
  recordedKeys,
  isLoading,
  onBack,
  onClose,
  onSelectProperty,
  onSelectBill,
  onAddBill,
}: {
  photoUri: string;
  period: string;
  onChangePeriod: (period: string) => void;
  options: readonly PhotoTagOption[];
  selected: PhotoTagOption | null;
  recordedKeys: ReadonlySet<string>;
  isLoading: boolean;
  onBack: () => void;
  onClose: () => void;
  onSelectProperty: (propertyId: string) => void;
  onSelectBill: (bill: BillingItem) => void;
  onAddBill: (property: Property) => void;
}) {
  const buildings = options.filter(
    (option) => option.property.type === "Building",
  );
  const units = options.filter((option) => option.property.type === "Unit");
  const buildingNames = new Map(
    buildings.map((option) => [option.property.id, option.property.name]),
  );

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          accessibilityLabel="Close photo tagger"
          className="flex-1"
          onPress={onClose}
        />
        <View className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-5">
          <View className="flex-row items-center">
            <Image
              className="mr-3 h-12 w-12 rounded-xl"
              resizeMode="cover"
              source={{ uri: photoUri }}
            />
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-lg font-extrabold text-slate-900">
                Tag photo
              </Text>
              <Text
                className="mt-0.5 text-[12px] text-slate-500"
                numberOfLines={1}
              >
                {selected
                  ? `${selected.property.name} · ${formatPeriodLabel(period)}`
                  : "Choose a property, then its bill."}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close photo tagger"
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              onPress={onClose}
            >
              <MaterialCommunityIcons color="#475569" name="close" size={20} />
            </Pressable>
          </View>

          {selected ? (
            <Pressable
              accessibilityLabel="Back to properties"
              className="mt-3 flex-row items-center self-start rounded-full bg-[#f1f5f9] px-3 py-1.5 active:opacity-70"
              onPress={onBack}
            >
              <MaterialCommunityIcons
                color="#475569"
                name="chevron-left"
                size={16}
              />
              <Text className="text-[11px] font-bold text-[#475569]">
                All properties
              </Text>
            </Pressable>
          ) : (
            <PeriodSwitcher onChange={onChangePeriod} period={period} />
          )}

          <View className="mt-3" style={{ flexShrink: 1 }}>
            {isLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator color="#4C45F5" />
                <Text className="mt-2 text-[12px] text-[#8b9bb0]">
                  Loading bills…
                </Text>
              </View>
            ) : selected ? (
              <ScrollView
                contentContainerStyle={{ paddingBottom: 4 }}
                showsVerticalScrollIndicator={false}
                style={{ flexShrink: 1 }}
              >
                {selected.bills.length === 0 ? (
                  <View className="items-center px-4 py-8">
                    <MaterialCommunityIcons
                      color="#94A3B8"
                      name="receipt-text-outline"
                      size={30}
                    />
                    <Text className="mt-2 text-center text-[13px] font-bold text-[#0d162a]">
                      No bills on this property
                    </Text>
                    <Text className="mt-1 text-center text-[12px] leading-4 text-[#7c8ba1]">
                      Add a bill for {formatPeriodLabel(period)} first, then
                      tag the photo to it.
                    </Text>
                    <Pressable
                      accessibilityLabel={`Add a bill for ${selected.property.name}`}
                      className="mt-4 rounded-xl bg-[#4C45F5] px-4 py-2.5 active:opacity-80"
                      onPress={() => onAddBill(selected.property)}
                    >
                      <Text className="text-[13px] font-bold text-white">
                        Add a bill
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
                      Bills
                    </Text>
                    {selected.bills.map((bill) => (
                      <BillRow
                        key={bill.id}
                        bill={bill}
                        onPress={() => onSelectBill(bill)}
                        tagged={recordedKeys.has(
                          entryKey(selected.property.id, bill.id),
                        )}
                      />
                    ))}
                  </>
                )}
              </ScrollView>
            ) : options.length === 0 ? (
              <View className="items-center px-4 py-10">
                <MaterialCommunityIcons
                  color="#94A3B8"
                  name="office-building-outline"
                  size={30}
                />
                <Text className="mt-2 text-center text-[13px] font-bold text-[#0d162a]">
                  No properties yet
                </Text>
                <Text className="mt-1 text-center text-[12px] leading-4 text-[#7c8ba1]">
                  Add a property and link its bills, then tag photos here.
                </Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={{ paddingBottom: 4 }}
                showsVerticalScrollIndicator={false}
                style={{ flexShrink: 1 }}
              >
                {buildings.length > 0 ? (
                  <>
                    <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
                      Buildings
                    </Text>
                    {buildings.map((option) => (
                      <PropertyRow
                        key={option.property.id}
                        onPress={() => onSelectProperty(option.property.id)}
                        option={option}
                      />
                    ))}
                  </>
                ) : null}

                {units.length > 0 ? (
                  <>
                    <Text className="mb-2 mt-2 text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
                      Units
                    </Text>
                    {units.map((option) => (
                      <PropertyRow
                        key={option.property.id}
                        onPress={() => onSelectProperty(option.property.id)}
                        option={option}
                        parentName={
                          option.property.parentBuildingId
                            ? buildingNames.get(option.property.parentBuildingId)
                            : undefined
                        }
                      />
                    ))}
                  </>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
