import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { getTenantName } from "../../tenants/logic/tenantRules";
import type { Property } from "../../properties/types";
import { getPropertyAddress } from "../../properties/logic/propertyRules";
import { formatCurrency, formatCurrencyWithSign } from "../../../utils/currency";
import {
  getUtilityIcon,
  getUtilityIconStyle,
} from "../../bills/components/utilityIcons";
import { MonthlyBillRow } from "./MonthlyBillRow";
import { PaymentStatus } from "./PaymentStatus";
import type {
  BuildingBillLine,
  BuildingMonthlyBilling,
  UnitBillLine,
  UnitBillSource,
  UnitMonthlyBilling,
} from "../types";

const SOURCE_LABELS: Record<UnitBillSource, string> = {
  "sub-meter": "Sub-meter",
  "fixed-share": "Fixed share",
  split: "Split across units",
  "per-person": "Per person",
  independent: "Independent bill",
};

export function PropertyBillingCard({
  billing,
  onPressBuildingBill,
  onOpenUnits,
  onShare,
  oneOffBillIds,
  onManageBuildingBill,
}: {
  billing: BuildingMonthlyBilling;
  onPressBuildingBill: (line: BuildingBillLine) => void;
  onOpenUnits: (property: Property) => void;
  onShare: () => void;
  oneOffBillIds: ReadonlySet<string>;
  onManageBuildingBill: (line: BuildingBillLine) => void;
}) {
  const { property, unitSummary } = billing;

  return (
    <View className="mb-3 rounded-[24px] border border-[#e4eaf2] bg-white p-4">
      <View className="flex-row items-start justify-between">
        <Pressable
          accessibilityLabel={`Open unit bills for ${property.name}`}
          className="min-w-0 flex-1 pr-3 active:opacity-70"
          onPress={() => onOpenUnits(property)}
        >
          <Text className="text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
            {property.type}
          </Text>
          <View className="flex-row items-center">
            <Text
              className="mr-1 shrink text-[18px] font-extrabold text-[#0d162a]"
              numberOfLines={1}
            >
              {property.name}
            </Text>
            <MaterialCommunityIcons
              color="#94A3B8"
              name="chevron-right"
              size={20}
            />
          </View>
          <Text className="text-[12px] text-[#637b99]" numberOfLines={1}>
            {getPropertyAddress(property) || "No address added"}
          </Text>
        </Pressable>
        <View className="flex-row items-start">
          <View className="items-end">
            <Text className="text-[10px] font-semibold uppercase text-[#637b99]">
              Owner net
            </Text>
            <Text
              className={`text-base font-extrabold ${
                billing.ownerNet < 0 ? "text-[#DC2626]" : "text-[#0d162a]"
              }`}
            >
              {formatCurrencyWithSign(billing.ownerNet)}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={`Share utilities for ${property.name}`}
            className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-[#EBECFF] active:opacity-70"
            onPress={onShare}
          >
            <MaterialCommunityIcons
              color="#4C45F5"
              name="share-variant-outline"
              size={17}
            />
          </Pressable>
        </View>
      </View>

      {billing.hasOverDeduction ? (
        <View className="mt-3 flex-row items-start rounded-xl bg-[#FEF2F2] px-3 py-2">
          <MaterialCommunityIcons
            color="#DC2626"
            name="alert-circle-outline"
            size={16}
          />
          <Text className="ml-2 flex-1 text-[11px] font-semibold text-[#B91C1C]">
            Sub-meter charges exceed this building&apos;s invoice. Check the
            readings or invoice amount.
          </Text>
        </View>
      ) : null}

      <View className="mt-2">
        {billing.lines.length === 0 ? (
          <Text className="py-3 text-[12px] text-[#8b9bb0]">
            No bills linked to this property.
          </Text>
        ) : (
          billing.lines.map((line) => (
            <MonthlyBillRow
              key={line.bill.id}
              line={line}
              onLongPress={
                oneOffBillIds.has(line.bill.id)
                  ? () => onManageBuildingBill(line)
                  : undefined
              }
              onPress={() => onPressBuildingBill(line)}
            />
          ))
        )}
      </View>

      {unitSummary.unitCount > 0 ? (
        <Pressable
          accessibilityLabel={`View ${unitSummary.unitCount} units for ${property.name}`}
          className="mt-3 flex-row items-center rounded-2xl bg-[#f8fafc] px-3 py-2.5 active:opacity-70"
          onPress={() => onOpenUnits(property)}
        >
          <View className="mr-2.5 h-9 w-9 items-center justify-center rounded-[12px] bg-[#EBECFF]">
            <MaterialCommunityIcons
              color="#4C45F5"
              name="door-open"
              size={19}
            />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[12px] font-extrabold text-[#0d162a]">
              {unitSummary.unitCount}{" "}
              {unitSummary.unitCount === 1 ? "unit" : "units"}
            </Text>
            <Text className="mt-0.5 text-[10px] text-[#7c8ba1]">
              {unitSummary.paidCount} paid · {unitSummary.unpaidCount} unpaid
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[12px] font-extrabold text-[#0d162a]">
              {formatCurrency(unitSummary.total)}
            </Text>
            <Text className="mt-0.5 text-[9px] font-semibold uppercase text-[#8091b1]">
              Unit bills
            </Text>
          </View>
          <MaterialCommunityIcons
            color="#94A3B8"
            name="chevron-right"
            size={20}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

export function UnitBillingCard({
  unit,
  onPressBill,
  onShare,
  oneOffBillIds,
  onManageBill,
}: {
  unit: UnitMonthlyBilling;
  /** Computed lines open the dialog on its payment tab. */
  onPressBill: (unit: Property, line: UnitBillLine) => void;
  onShare: () => void;
  oneOffBillIds: ReadonlySet<string>;
  onManageBill: (unit: Property, line: UnitBillLine) => void;
}) {
  const tenantNames = unit.tenants
    .map((tenant) => getTenantName(tenant))
    .join(", ");

  return (
    <View className="mb-2 rounded-[16px] bg-[#f8fafc] p-3">
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1 pr-2">
          <Text
            className="text-[13px] font-extrabold text-[#0d162a]"
            numberOfLines={1}
          >
            {unit.property.name}
          </Text>
          <Text className="text-[10px] text-[#7c8ba1]" numberOfLines={1}>
            {tenantNames || "No tenants"}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-[13px] font-extrabold text-[#0d162a]">
            {formatCurrency(unit.total)}
          </Text>
          <Pressable
            accessibilityLabel={`Share utilities for ${unit.property.name}`}
            className="h-8 w-8 items-center justify-center rounded-full bg-white active:opacity-70"
            onPress={onShare}
          >
            <MaterialCommunityIcons
              color="#4C45F5"
              name="share-variant-outline"
              size={15}
            />
          </Pressable>
        </View>
      </View>

      {unit.lines.length === 0 ? (
        <Text className="mt-2 text-[11px] text-[#8b9bb0]">
          No bills linked to this unit.
        </Text>
      ) : (
        unit.lines.map((line) => {
          const iconStyle = getUtilityIconStyle(line.bill.utilityType);
          return (
            <Pressable
              key={line.bill.id}
              accessibilityHint={
                oneOffBillIds.has(line.bill.id) &&
                line.source === "independent"
                  ? "Long press to edit or delete this one-off bill"
                  : undefined
              }
              accessibilityLabel={`Open ${line.bill.name} for ${unit.property.name}`}
              className="mt-2 flex-row items-center justify-between rounded-xl border border-[#eef1f6] bg-white px-2.5 py-2 active:opacity-70"
              delayLongPress={400}
              onLongPress={
                oneOffBillIds.has(line.bill.id) &&
                line.source === "independent"
                  ? () => onManageBill(unit.property, line)
                  : undefined
              }
              onPress={() => onPressBill(unit.property, line)}
            >
              <View
                className="mr-2.5 h-8 w-8 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: iconStyle.backgroundColor }}
              >
                <MaterialCommunityIcons
                  color={iconStyle.iconColor}
                  name={getUtilityIcon(line.bill.utilityType)}
                  size={17}
                />
              </View>
              <View className="min-w-0 flex-1 pr-2">
                <View className="flex-row items-center">
                  <Text
                    className="mr-1 shrink text-[12px] font-bold text-[#29466c]"
                    numberOfLines={1}
                  >
                    {line.bill.name}
                  </Text>
                  {line.photoUri ? (
                    <MaterialCommunityIcons
                      color="#0891B2"
                      name="camera"
                      size={12}
                    />
                  ) : null}
                </View>
                <Text className="text-[10px] text-[#7c8ba1]" numberOfLines={1}>
                  {SOURCE_LABELS[line.source]}
                  {line.consumption !== undefined
                    ? ` · ${line.consumption} ${line.bill.displayUnit || "units"}`
                    : line.reading !== undefined
                      ? ` · ${line.reading} ${line.bill.displayUnit || "units"}`
                      : ""}
                </Text>
              </View>
              <View className="items-end">
                <Text
                  className={`text-[12px] font-extrabold ${
                    line.status === "missing"
                      ? "text-[#B45309]"
                      : "text-[#0d162a]"
                  }`}
                >
                  {line.amount !== undefined
                    ? formatCurrency(line.amount)
                    : "Missing"}
                </Text>
                <PaymentStatus paidAt={line.paidAt} />
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
