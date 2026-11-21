import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import { persistPhoto } from "../../../services/photoStorage";
import { createTimestampId } from "../../../utils/id";
import { getBillingItems } from "../../bills/services/billingRepository";
import type { BillingItem } from "../../bills/types";
import { getTenants } from "../../tenants/services/tenantRepository";
import type { Tenant } from "../../tenants/types";
import {
  buildPropertyRecord,
  propertyToDraft,
} from "../logic/propertyRules";
import {
  deletePropertyRecord,
  getBuildings,
  getChildUnits,
  getProperties,
  savePropertyRecord,
} from "../services/propertyRepository";
import type { Property, PropertyDraft } from "../types";

const EMPTY_PROPERTY_DRAFT: PropertyDraft = {
  name: "",
  type: "Building",
  parentBuildingId: null,
  street: "",
  barangay: "",
  city: "",
  province: "",
  zipCode: "",
  country: "Philippines",
  photos: [],
  billIds: [],
  subMeterBillIds: [],
  fixedBillShares: {},
  tenantIds: [],
};

/**
 * Multi-step property form: owns the draft, reference data, relation toggles,
 * photo persistence, save, and the child-unit delete guard.
 */
export function usePropertyForm({
  id,
  presetParentBuildingId,
  presetType,
}: {
  id?: string;
  presetParentBuildingId?: string;
  presetType?: string;
}) {
  const [form, setForm] = useState<PropertyDraft>(() => ({
    ...EMPTY_PROPERTY_DRAFT,
    parentBuildingId: presetParentBuildingId ?? null,
    type: presetType === "Unit" ? "Unit" : "Building",
  }));
  const [bills, setBills] = useState<BillingItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Property[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Re-loads on focus so bills/tenants created from this screen appear.
  useFocusReload(
    useCallback(() => {
      void (async () => {
        const [billsData, tenantsData, buildingsData] = await Promise.all([
          getBillingItems(),
          getTenants(),
          getBuildings(),
        ]);
        setBills(billsData);
        setTenants(tenantsData);
        setBuildings(buildingsData);

        if (!id) return;
        const existing = (await getProperties()).find((item) => item.id === id);
        if (existing) setForm(propertyToDraft(existing));
      })();
    }, [id]),
  );

  const update = useCallback(
    <K extends keyof PropertyDraft>(field: K, value: PropertyDraft[K]) =>
      setForm((current) => ({ ...current, [field]: value })),
    [],
  );

  const applyParentAddress = useCallback(
    (buildingId: string) => {
      const building = buildings.find((item) => item.id === buildingId);
      if (!building) return;
      setForm((current) => ({
        ...current,
        street: building.street,
        barangay: building.barangay,
        city: building.city,
        province: building.province,
        zipCode: building.zipCode,
        country: building.country,
      }));
    },
    [buildings],
  );

  const clearAddress = useCallback(
    () =>
      setForm((current) => ({
        ...current,
        street: "",
        barangay: "",
        city: "",
        province: "",
        zipCode: "",
        country: "Philippines",
      })),
    [],
  );

  const toggleBill = useCallback((billId: string) => {
    setForm((current) => {
      const isSelected = current.billIds.includes(billId);
      return {
        ...current,
        billIds: isSelected
          ? current.billIds.filter((id) => id !== billId)
          : [...current.billIds, billId],
        subMeterBillIds: isSelected
          ? current.subMeterBillIds.filter((id) => id !== billId)
          : current.subMeterBillIds,
        fixedBillShares: isSelected
          ? Object.fromEntries(
              Object.entries(current.fixedBillShares).filter(
                ([id]) => id !== billId,
              ),
            )
          : current.fixedBillShares,
      };
    });
  }, []);

  const toggleSubMeterBill = useCallback((billId: string) => {
    setForm((current) => ({
      ...current,
      subMeterBillIds: current.subMeterBillIds.includes(billId)
        ? current.subMeterBillIds.filter((id) => id !== billId)
        : [...current.subMeterBillIds, billId],
    }));
  }, []);

  const toggleFixedShare = useCallback((billId: string) => {
    setForm((current) => {
      const shares = { ...current.fixedBillShares };
      if (shares[billId] !== undefined) {
        delete shares[billId];
      } else {
        shares[billId] = 0;
      }
      return { ...current, fixedBillShares: shares };
    });
  }, []);

  const setFixedShareAmount = useCallback((billId: string, amount: number) => {
    setForm((current) => ({
      ...current,
      fixedBillShares: { ...current.fixedBillShares, [billId]: amount },
    }));
  }, []);

  const toggleTenant = useCallback((tenantId: string) => {
    setForm((current) => ({
      ...current,
      tenantIds: current.tenantIds.includes(tenantId)
        ? current.tenantIds.filter((id) => id !== tenantId)
        : [...current.tenantIds, tenantId],
    }));
  }, []);

  const addPhotos = useCallback((uris: string[]) => {
    setForm((current) => ({ ...current, photos: [...current.photos, ...uris] }));
  }, []);

  const removePhoto = useCallback((index: number) => {
    setForm((current) => ({
      ...current,
      photos: current.photos.filter((_, itemIndex) => itemIndex !== index),
    }));
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      // Copy freshly picked photos into app-private storage; existing
      // app-private paths are returned unchanged.
      const persistedPhotos = (
        await Promise.all(
          form.photos.map((photo) => persistPhoto(photo, "property-photo")),
        )
      ).filter((photo): photo is string => Boolean(photo));

      await savePropertyRecord(
        buildPropertyRecord({
          id: id ?? createTimestampId(),
          draft: form,
          persistedPhotos,
          bills,
          parentBillIds: buildings.find(
            (building) => building.id === form.parentBuildingId,
          )?.billIds,
          createdAt: new Date().toISOString(),
        }),
      );
    } finally {
      setIsSaving(false);
    }
  }, [bills, buildings, form, id]);

  /** A building can only be removed once its units are gone or reassigned. */
  const countChildUnits = useCallback(
    async () => (id ? (await getChildUnits(id)).length : 0),
    [id],
  );

  const deleteRecord = useCallback(async () => {
    if (id) await deletePropertyRecord(id);
  }, [id]);

  return {
    form,
    bills,
    tenants,
    buildings,
    isSaving,
    update,
    applyParentAddress,
    clearAddress,
    toggleBill,
    toggleSubMeterBill,
    toggleFixedShare,
    setFixedShareAmount,
    toggleTenant,
    addPhotos,
    removePhoto,
    save,
    countChildUnits,
    deleteRecord,
  };
}
