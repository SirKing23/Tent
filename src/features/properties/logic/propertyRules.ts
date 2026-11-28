import type { ValidationResult } from "../../../types/validation";
import {
  isFixedShareEligible,
  pruneSubMeterBillIds,
} from "../../bills/logic/billingRules";
import type { BillingItem } from "../../bills/types";
import type { Tenant } from "../../tenants/types";

import type { Property, PropertyDraft, PropertyType } from "../types";

type PropertyAddressSource = Pick<
  Property,
  "street" | "barangay" | "city" | "province"
> & { street2?: string };

export const getPropertyAddress = (
  property: PropertyAddressSource | null | undefined,
): string =>
  [
    property?.street,
    property?.street2,
    property?.barangay,
    property?.city,
    property?.province,
  ]
    .filter(Boolean)
    .join(", ");

export type PropertyTypeFilter = PropertyType | "all";

/** Search across property fields and its parent building's name. */
export const filterProperties = (
  properties: readonly Property[],
  { query, type }: { query: string; type: PropertyTypeFilter },
): Property[] => {
  const search = query.trim().toLowerCase();
  const parentById = new Map(
    properties.map((property) => [property.id, property]),
  );

  return properties.filter((property) => {
    if (type !== "all" && property.type !== type) return false;
    if (!search) return true;
    const parent = property.parentBuildingId
      ? parentById.get(property.parentBuildingId)
      : undefined;
    return [
      property.name,
      property.type,
      property.street,
      property.street2,
      property.barangay,
      property.city,
      property.province,
      property.country,
      parent?.name ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
};

export const countPropertiesByType = (properties: readonly Property[]) => ({
  buildings: properties.filter((property) => property.type === "Building")
    .length,
  units: properties.filter((property) => property.type === "Unit").length,
  total: properties.length,
});

export const countChildUnits = (
  properties: readonly Property[],
  buildingId: string,
): number =>
  properties.filter(
    (property) =>
      property.type === "Unit" && property.parentBuildingId === buildingId,
  ).length;

/** Splits ids into buildings that still have units and the ones safe to delete. */
export const partitionPropertyIdsByChildUnits = (
  properties: readonly Property[],
  ids: readonly string[],
): { blocked: string[]; deletable: string[] } => {
  const blocked = ids.filter(
    (id) => countChildUnits(properties, id) > 0,
  );
  return {
    blocked,
    deletable: ids.filter((id) => !blocked.includes(id)),
  };
};

export type PropertyInfoDraft = Pick<
  PropertyDraft,
  "name" | "type" | "parentBuildingId" | "street" | "city" | "province"
>;

export const validatePropertyInfoStep = (
  draft: PropertyInfoDraft,
): ValidationResult => {
  if (!draft.name.trim()) {
    return {
      valid: false,
      title: "Missing field",
      message: "Please enter a Property Name.",
    };
  }
  if (!draft.city.trim() || !draft.province.trim()) {
    return {
      valid: false,
      title: "Missing address",
      message: "Please choose the City/Municipality and Province.",
    };
  }
  if (draft.type === "Unit" && !draft.parentBuildingId) {
    return {
      valid: false,
      title: "Missing field",
      message: "Please select the Building this unit belongs to.",
    };
  }
  return { valid: true };
};

/** Maps a stored property into the editable multi-step form shape. */
export const propertyToDraft = (property: Property): PropertyDraft => ({
  name: property.name,
  type: property.type,
  parentBuildingId: property.parentBuildingId,
  street: property.street,
  street2: property.street2 ?? "",
  barangay: property.barangay,
  city: property.city,
  province: property.province,
  zipCode: property.zipCode,
  country: property.country,
  photos: property.photos ?? [],
  billIds: property.billIds,
  subMeterBillIds: property.subMeterBillIds ?? [],
  fixedBillShares: property.fixedBillShares ?? {},
  tenantIds: property.tenantIds,
});

/**
 * Drops fixed shares that no longer apply: the bill must still be linked, the
 * property must be a unit, the parent building must carry the bill, and the
 * bill must be fixed-amount.
 */
export const sanitizeFixedBillShares = ({
  shares,
  billIds,
  propertyType,
  parentBillIds,
  bills,
}: {
  shares: Readonly<Record<string, number>>;
  billIds: readonly string[];
  propertyType: "Building" | "Unit";
  parentBillIds: readonly string[] | undefined;
  bills: readonly Pick<BillingItem, "id" | "billingType">[];
}): Record<string, number> => {
  if (propertyType !== "Unit" || !parentBillIds) return {};

  const result: Record<string, number> = {};
  for (const [billId, amount] of Object.entries(shares)) {
    const bill = bills.find((item) => item.id === billId);
    if (
      billIds.includes(billId) &&
      parentBillIds.includes(billId) &&
      bill &&
      isFixedShareEligible(bill.billingType) &&
      Number.isFinite(amount) &&
      amount >= 0
    ) {
      result[billId] = amount;
    }
  }
  return result;
};

/** Builds the persisted record, trimming input and pruning stale sub-meters. */
export const buildPropertyRecord = ({
  id,
  draft,
  persistedPhotos,
  bills,
  parentBillIds,
  createdAt,
}: {
  id: string;
  draft: PropertyDraft;
  persistedPhotos: readonly string[];
  bills: readonly BillingItem[];
  parentBillIds: readonly string[] | undefined;
  createdAt: string;
}): Property => ({
  id,
  name: draft.name.trim(),
  type: draft.type,
  parentBuildingId: draft.parentBuildingId,
  street: draft.street.trim(),
  street2: draft.street2.trim(),
  barangay: draft.barangay.trim(),
  city: draft.city.trim(),
  province: draft.province.trim(),
  zipCode: draft.zipCode.trim(),
  country: draft.country.trim() || "Philippines",
  photos: [...persistedPhotos],
  billIds: draft.billIds,
  subMeterBillIds: pruneSubMeterBillIds({
    subMeterBillIds: draft.subMeterBillIds,
    billIds: draft.billIds,
    propertyType: draft.type,
    parentBillIds,
    bills,
  }),
  fixedBillShares: sanitizeFixedBillShares({
    shares: draft.fixedBillShares,
    billIds: draft.billIds,
    propertyType: draft.type,
    parentBillIds,
    bills,
  }),
  tenantIds: draft.tenantIds,
  createdAt,
});

export type PropertySummary = {
  photos: string[];
  linkedBills: BillingItem[];
  linkedTenants: Tenant[];
  parentBuilding: Property | undefined;
};
export const resolvePropertySummary = ({
  property,
  bills,
  tenants,
  buildings,
}: {
  property: Property | null;
  bills: readonly BillingItem[];
  tenants: readonly Tenant[];
  buildings: readonly Property[];
}): PropertySummary => ({
  photos: property?.photos ?? [],
  linkedBills: property
    ? bills.filter((bill) => property.billIds.includes(bill.id))
    : [],
  linkedTenants: property
    ? tenants.filter((tenant) => property.tenantIds.includes(tenant.id))
    : [],
  parentBuilding: property?.parentBuildingId
    ? buildings.find(
        (building) => building.id === property.parentBuildingId,
      )
    : undefined,
});
