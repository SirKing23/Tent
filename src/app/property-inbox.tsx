import { MaterialCommunityIcons } from "@expo/vector-icons";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { UnitCard } from "../features/properties/components/UnitCard";
import { useBuildingUnits } from "../features/properties/hooks/useBuildingUnits";
import {
  getPropertyAddress,
  resolveOccupancyByProperty,
} from "../features/properties/logic/propertyRules";
import { resolvePhotoUri } from "../services/photoStorage";

export default function PropertyUnitsInboxScreen() {
  const router = useRouter();
  const { buildingId } = useLocalSearchParams<{ buildingId?: string }>();

  const { building, units, tenants } = useBuildingUnits(buildingId);
  const occupancyById = useMemo(
    () => resolveOccupancyByProperty(units, tenants),
    [units, tenants],
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
                occupancy={occupancyById.get(unit.id)}
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
