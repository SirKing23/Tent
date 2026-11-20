import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@react-native-vector-icons/ionicons";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "../../global.css";
import { resolvePhotoUri } from "../lib/photoStorage";
import { getChildUnits, getProperties, type Property } from "../lib/properties";

const getPropertyAddress = (property: Property | null) =>
  [property?.street, property?.barangay, property?.city, property?.province]
    .filter(Boolean)
    .join(", ");

export default function PropertyUnitsInboxScreen() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();

  const [building, setBuilding] = useState<Property | null>(null);
  const [units, setUnits] = useState<Property[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        if (!buildingId) return;
        const [properties, childUnits] = await Promise.all([
          getProperties(),
          getChildUnits(buildingId),
        ]);
        if (!active) return;
        setBuilding(properties.find((item) => item.id === buildingId) ?? null);
        setUnits(childUnits);
      })();
      return () => {
        active = false;
      };
    }, [buildingId]),
  );

  const addUnit = () =>
    router.push({
      pathname: "/properties-AddNewProperties",
      params: { parentBuildingId: buildingId ?? "", type: "Unit" },
    });

  const buildingCover = building?.photos?.[0];

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: "#f7f9fc" }}>
      <Stack.Screen options={{ headerShown: true, title: "Units" }} />

      <View className="flex-row items-center justify-between px-[16px] pb-[14px] pt-[6px]">
        <View className="min-w-0 flex-1 flex-row items-center">
          {buildingCover ? (
            <Image
              className="h-[52px] w-[52px] rounded-[16px]"
              source={{
                uri: resolvePhotoUri(buildingCover) ?? buildingCover,
              }}
            />
          ) : (
            <View className="h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-[#6548ee]">
              <MaterialCommunityIcons
                color="#fff"
                name="office-building-outline"
                size={25}
              />
            </View>
          )}
          <View className="ml-[12px] min-w-0 flex-1">
            <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#8091b1]">
              Parent building
            </Text>
            <Text
              className="text-[18px] font-extrabold text-[#0d162a]"
              numberOfLines={1}
            >
              {building?.name ?? "Building"}
            </Text>
            <Text className="text-[12px] text-[#7c8ba1]" numberOfLines={1}>
              {getPropertyAddress(building) || "No address added"}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Add unit to this building"
          className="ml-[10px] h-[42px] w-[42px] items-center justify-center rounded-[21px] bg-[#5041df]"
          onPress={addUnit}
          style={{
            elevation: 4,
            shadowColor: "#5041df",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.28,
            shadowRadius: 7,
          }}
        >
          <Ionicons color="#fff" name="add" size={24} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-[16px] pb-[28px]"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-[10px] flex-row items-center justify-between pt-[4px]">
          <Text className="text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
            Units ({units.length})
          </Text>
          {units.length ? (
            <Text className="text-[10px] text-[#96a4b7]">
              Tap a card to open its summary
            </Text>
          ) : null}
        </View>

        {units.length ? (
          <View className="gap-[12px]">
            {units.map((unit) => (
              <UnitCard
                key={unit.id}
                onEdit={() =>
                  router.push({
                    pathname: "/properties-AddNewProperties",
                    params: { id: unit.id },
                  })
                }
                onPress={() =>
                  router.push({
                    pathname: "/properties-summary",
                    params: { id: unit.id },
                  })
                }
                unit={unit}
              />
            ))}
          </View>
        ) : (
          <View className="items-center rounded-[24px] border border-[#e4eaf2] bg-white px-[24px] py-[44px]">
            <View className="h-[64px] w-[64px] items-center justify-center rounded-[20px] bg-[#E0F7FA]">
              <MaterialCommunityIcons
                color="#0891B2"
                name="door-open"
                size={30}
              />
            </View>
            <Text className="mt-[12px] text-[16px] font-extrabold text-[#1a2b44]">
              No units in this building
            </Text>
            <Text className="mt-[4px] text-center text-[13px] text-[#7890ae]">
              Tap the + button to add the first unit for{" "}
              {building?.name ?? "this building"}.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function UnitCard({
  unit,
  onPress,
  onEdit,
}: {
  unit: Property;
  onPress: () => void;
  onEdit: () => void;
}) {
  const address = getPropertyAddress(unit);
  const cover = unit.photos?.[0];
  const photoCount = unit.photos?.length ?? 0;

  return (
    <Pressable
      className="rounded-[24px] border border-[#e4eaf2] border-l-[3px] border-l-[#0891b2] bg-white p-[16px]"
      onPress={onPress}
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
          </View>
          <Text
            className="mb-[3px] text-[12px] text-[#526986]"
            numberOfLines={1}
          >
            {address || "No address added"}
          </Text>
          <Text className="text-[11px] text-[#8495aa]" numberOfLines={1}>
            {photoCount
              ? `${photoCount} photo${photoCount !== 1 ? "s" : ""}`
              : "No photos added"}
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
            {unit.billIds.length} Bill
            {unit.billIds.length !== 1 ? "s" : ""}
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
            {unit.tenantIds.length} Tenant
            {unit.tenantIds.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <MaterialCommunityIcons color="#2F5688" name="chevron-right" size={18} />
      </View>
    </Pressable>
  );
}
