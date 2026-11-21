import Ionicons from "@react-native-vector-icons/ionicons";
import { Image, Pressable, Text, View } from "react-native";

import { resolvePhotoUri } from "../../../services/photoStorage";
import { getTenantInitials, getTenantName } from "../logic/tenantRules";
import type { Tenant } from "../types";

type TenantCardProps = {
  tenant: Tenant;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onEdit: () => void;
  onPreview: (uri: string, label: string) => void;
};

export function TenantCard({
  tenant,
  selected,
  onPress,
  onLongPress,
  onEdit,
  onPreview,
}: TenantCardProps) {
  const statusClass =
    tenant.tenantStatus === "Active"
      ? "bg-[#e3f8f0]"
      : tenant.tenantStatus === "Inactive"
        ? "bg-[#fff1dd]"
        : "bg-[#eef0ff]";
  const statusTextClass =
    tenant.tenantStatus === "Active"
      ? "text-[#009a61]"
      : tenant.tenantStatus === "Inactive"
        ? "text-[#d96a00]"
        : "text-[#5146e5]";

  return (
    <Pressable
      className={`rounded-[24px] border p-[16px] ${
        selected ? "border-[#99dfd1] bg-[#eefbf8]" : "border-[#e4eaf2] bg-white"
      }`}
      delayLongPress={300}
      onLongPress={onLongPress}
      onPress={onPress}
    >
      <View className="flex-row items-center">
        {selected ? (
          <View className="h-[48px] w-[48px] items-center justify-center rounded-[24px] bg-[#0f766e]">
            <Ionicons color="#fff" name="checkmark" size={18} />
          </View>
        ) : tenant.photo ? (
          <Pressable
            onPress={() =>
              onPreview(
                resolvePhotoUri(tenant.photo) ?? (tenant.photo as string),
                "Tenant photo",
              )
            }
          >
            <Image
              className="h-[48px] w-[48px] rounded-[15px]"
              source={{ uri: resolvePhotoUri(tenant.photo) ?? tenant.photo }}
            />
          </Pressable>
        ) : (
          <View className="h-[48px] w-[48px] items-center justify-center rounded-[15px] bg-[#6548ee]">
            <Text className="text-[15px] font-extrabold text-white">
              {getTenantInitials(tenant)}
            </Text>
          </View>
        )}
        <View className="ml-[12px] min-w-0 flex-1">
          <Text
            className="mb-[5px] text-[15px] font-extrabold text-[#101a2e]"
            numberOfLines={1}
          >
            {getTenantName(tenant)}
          </Text>
          <View className="mb-[3px] flex-row items-center gap-[7px]">
            <View className={`rounded-[10px] px-[8px] py-[3px] ${statusClass}`}>
              <Text className={`text-[10px] font-extrabold ${statusTextClass}`}>
                {tenant.tenantStatus}
              </Text>
            </View>
          </View>
          <Text className="mb-[3px] text-[12px] text-[#526986]">
            {tenant.phone}
          </Text>
          <Text className="text-[11px] text-[#8495aa]" numberOfLines={1}>
            {tenant.email || "No email added"}
          </Text>
        </View>
        <Pressable
          className="ml-[7px] h-[34px] w-[34px] items-center justify-center rounded-[14px] bg-[#f1f5f9]"
          onPress={onEdit}
        >
          <Ionicons color="#22324a" name="create-outline" size={17} />
        </Pressable>
      </View>
      <View className="mt-[14px] flex-row items-center border-t border-t-[#edf1f6] pt-[12px]">
        <View className="flex-1 flex-row items-center gap-[5px]">
          <Ionicons color="#009a61" name="shield-checkmark-outline" size={15} />
          <Text className="flex-1 text-[11px] text-[#526986]" numberOfLines={1}>
            {tenant.idType} · {tenant.idNumber}
          </Text>
        </View>
        {tenant.idPhoto ? (
          <Pressable
            accessibilityLabel="View ID photo"
            className="ml-[8px] h-[30px] w-[30px] items-center justify-center rounded-[14px] bg-[#eef0ff]"
            onPress={() =>
              onPreview(
                resolvePhotoUri(tenant.idPhoto) ?? (tenant.idPhoto as string),
                "ID photo",
              )
            }
          >
            <Ionicons color="#5146e5" name="eye-outline" size={17} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
