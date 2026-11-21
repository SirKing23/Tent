import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { getTenantName } from "../../tenants/logic/tenantRules";
import type { Property } from "../../properties/types";
import {
  getPropertyAddress,
} from "../../properties/logic/propertyRules";
import {
  formatPeso,
  formatPesoWithSign,
} from "../../../utils/currency";
import {
  getUtilityIcon,
  getUtilityIconStyle,
} from "../../bills/components/utilityIcons";
import { MonthlyBillRow } from "./MonthlyBillRow";
import { PaymentChip } from "./PaymentChip";
import type { BillingItem } from "../../bills/types";
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

/** Split and per-person lines are computed allocations, not editable readings. */
const isEditableSource = (source: UnitBillSource) =>
  source === "sub-meter" || source === "independent";

export function PropertyBillingCard({
  billing,
  onPressBuildingBill,
  onPressUnitBill,
  onPressPayment,
}: {
  billing: BuildingMonthlyBilling;
  onPressBuildingBill: (line: BuildingBillLine) => void;
  onPressUnitBill: (unit: Property, line: UnitBillLine) => void;
  onPressPayment: (property: Property, bill: BillingItem) => void;
}) {
  const { property } = billing;

  return (
    <View className="mb-3 rounded-[24px] border border-[#e4eaf2] bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
            {property.type}
          </Text>
          <Text
            className="text-[18px] font-extrabold text-[#0d162a]"
            numberOfLines={1}
          >
            {property.name}
          </Text>
          <Text className="text-[12px] text-[#637b99]" numberOfLines={1}>
            {getPropertyAddress(property) || "No address added"}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[10px] font-semibold uppercase text-[#637b99]">
            Owner net
          </Text>
          <Text
            className={`text-base font-extrabold ${
              billing.ownerNet < 0 ? "text-[#DC2626]" : "text-[#0d162a]"
            }`}
          >
            {formatPesoWithSign(billing.ownerNet)}
          </Text>
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
              onPress={() => onPressBuildingBill(line)}
              onPressPayment={() => onPressPayment(property, line.bill)}
            />
          ))
        )}
      </View>

      {billing.units.length > 0 ? (
        <View className="mt-2 border-t border-[#eef1f6] pt-3">
          <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.7px] text-[#8091b1]">
            Units
          </Text>
          {billing.units.map((unit) => (
            <UnitBillingCard
              key={unit.property.id}
              onPressBill={onPressUnitBill}
              onPressPayment={onPressPayment}
              unit={unit}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function UnitBillingCard({
  unit,
  onPressBill,
  onPressPayment,
}: {
  unit: UnitMonthlyBilling;
  onPressBill: (unit: Property, line: UnitBillLine) => void;
  onPressPayment: (property: Property, bill: BillingItem) => void;
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
        <Text className="text-[13px] font-extrabold text-[#0d162a]">
          {formatPeso(unit.total)}
        </Text>
      </View>

      {unit.lines.length === 0 ? (
        <Text className="mt-2 text-[11px] text-[#8b9bb0]">
          No bills linked to this unit.
        </Text>
      ) : (
        unit.lines.map((line) => {
          const editable = isEditableSource(line.source);
          const iconStyle = getUtilityIconStyle(line.bill.utilityType);
          return (
            <Pressable
              key={line.bill.id}
              accessibilityLabel={`Set ${line.bill.name} for ${unit.property.name}`}
              className={`mt-2 flex-row items-center justify-between rounded-xl border border-[#eef1f6] bg-white px-2.5 py-2 ${editable ? "active:opacity-70" : ""}`}
              onPress={() => {
                if (editable) onPressBill(unit.property, line);
              }}
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
                    ? formatPeso(line.amount)
                    : "Missing"}
                </Text>
                <PaymentChip
                  onPress={() => onPressPayment(unit.property, line.bill)}
                  paidAt={line.paidAt}
                />
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
