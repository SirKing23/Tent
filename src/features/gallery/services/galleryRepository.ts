import {
  deleteStoredPhoto,
  getStoredPhotoTimestamp,
  resolvePhotoUri,
} from "../../../services/photoStorage";
import { formatCurrency } from "../../../utils/currency";
import { formatDateMDY } from "../../../utils/date";
import { formatPeriodLabel } from "../../../utils/period";
import { getBillingItems } from "../../bills/services/billingRepository";
import type { BillingItem } from "../../bills/types";
import {
  getCashbookEntries,
  saveCashbookEntry,
} from "../../cashbooks/services/cashbookEntryRepository";
import { getCashbooks } from "../../cashbooks/services/cashbookRepository";
import { getAllMonthlyOnlyBills } from "../../monthlyBilling/services/monthlyBillItemsRepository";
import {
  clearMonthlyBillPaymentProof,
  clearMonthlyBillPhoto,
  getAllMonthlyBillEntries,
} from "../../monthlyBilling/services/monthlyBillingRepository";
import { getPropertyAddress } from "../../properties/logic/propertyRules";
import {
  getProperties,
  savePropertyRecord,
} from "../../properties/services/propertyRepository";
import { getTenantName } from "../../tenants/logic/tenantRules";
import {
  getTenants,
  saveTenantRecord,
} from "../../tenants/services/tenantRepository";

import { formatGalleryDateTime, resolveSavedAt } from "../logic/gallery";
import type { GalleryAsset, GalleryFact } from "../types";

type FactInput = { label: string; value: string | null | undefined };

const compactFacts = (facts: (FactInput | null)[]): GalleryFact[] => {
  const result: GalleryFact[] = [];
  for (const fact of facts) {
    if (!fact) continue;
    const value = fact.value?.trim();
    if (value) result.push({ label: fact.label, value });
  }
  return result;
};

const formatStoredDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatDateMDY(date);
};

const formatReading = (
  value: number | undefined,
  unit: string | undefined,
): string | null =>
  value === undefined
    ? null
    : `${value.toLocaleString()}${unit ? ` ${unit}` : ""}`;

/** Loads every photo the app keeps and describes where each one is used. */
export async function getGalleryAssets(): Promise<GalleryAsset[]> {
  const [
    properties,
    tenants,
    cashbookEntries,
    cashbooks,
    billEntries,
    monthlyOnlyBills,
    billingItems,
  ] = await Promise.all([
    getProperties(),
    getTenants(),
    getCashbookEntries(),
    getCashbooks(),
    getAllMonthlyBillEntries(),
    getAllMonthlyOnlyBills(),
    getBillingItems(),
  ]);

  const assets: GalleryAsset[] = [];
  const seen = new Set<string>();

  const add = (asset: GalleryAsset | null) => {
    if (!asset || seen.has(asset.storedPath)) return;
    seen.add(asset.storedPath);
    assets.push(asset);
  };

  const savedAtFor = (storedPath: string, fallback?: string | null) =>
    resolveSavedAt(storedPath, {
      fileTimestamp: getStoredPhotoTimestamp(storedPath),
      fallback,
    });

  const buildAsset = (
    input: Omit<GalleryAsset, "key" | "uri" | "storedPath">,
    storedPath: string,
  ): GalleryAsset => ({
    ...input,
    key: `${input.kind}:${storedPath}`,
    storedPath,
    uri: resolvePhotoUri(storedPath) ?? storedPath,
  });

  for (const property of properties) {
    property.photos.forEach((photo, index) => {
      const savedAt = savedAtFor(photo, property.createdAt);
      add(
        buildAsset(
          {
            kind: "property-photo",
            savedAt,
            tag: index === 0 ? "Property cover" : "Property photo",
            title: property.name.trim() || "Property",
            subtitle: getPropertyAddress(property) || property.type,
            facts: compactFacts([
              { label: "Property", value: property.name.trim() || "Untitled" },
              {
                label: "Photo",
                value: `${index + 1} of ${property.photos.length}${
                  index === 0 ? " · Cover" : ""
                }`,
              },
              { label: "Type", value: property.type },
              {
                label: "Address",
                value: getPropertyAddress(property) || "No address added",
              },
              { label: "Saved", value: formatGalleryDateTime(savedAt) },
            ]),
            target: { kind: "property", propertyId: property.id },
            ref: { kind: "property-photo", propertyId: property.id },
          },
          photo,
        ),
      );
    });
  }

  for (const tenant of tenants) {
    const tenantName = getTenantName(tenant).trim() || "Tenant";

    if (tenant.photo) {
      const savedAt = savedAtFor(tenant.photo);
      add(
        buildAsset(
          {
            kind: "tenant-photo",
            savedAt,
            tag: "Tenant photo",
            title: tenantName,
            subtitle: tenant.tenantStatus,
            facts: compactFacts([
              { label: "Tenant", value: tenantName },
              { label: "Status", value: tenant.tenantStatus },
              { label: "Phone", value: tenant.phone },
              { label: "Email", value: tenant.email },
              { label: "Saved", value: formatGalleryDateTime(savedAt) },
            ]),
            target: { kind: "tenants", tenantId: tenant.id },
            ref: { kind: "tenant-photo", tenantId: tenant.id },
          },
          tenant.photo,
        ),
      );
    }

    if (tenant.idPhoto) {
      const savedAt = savedAtFor(tenant.idPhoto);
      add(
        buildAsset(
          {
            kind: "tenant-id",
            savedAt,
            tag: "Tenant ID",
            title: tenantName,
            subtitle: tenant.idType || "Valid ID",
            facts: compactFacts([
              { label: "Tenant", value: tenantName },
              { label: "ID type", value: tenant.idType },
              { label: "ID number", value: tenant.idNumber },
              { label: "Status", value: tenant.tenantStatus },
              { label: "Saved", value: formatGalleryDateTime(savedAt) },
            ]),
            target: { kind: "tenants", tenantId: tenant.id },
            ref: { kind: "tenant-id", tenantId: tenant.id },
          },
          tenant.idPhoto,
        ),
      );
    }
  }

  const cashbookTitles = new Map(
    cashbooks.map((cashbook) => [cashbook.id, cashbook.title.trim()]),
  );

  for (const entry of cashbookEntries) {
    if (!entry.imageUri) continue;

    const savedAt = savedAtFor(entry.imageUri, entry.createdAt || entry.date);
    const typeLabel = entry.type === "cashIn" ? "Cash in" : "Cash out";
    const bookTitle =
      cashbookTitles.get(entry.cashbookId) || "Cashbook";

    add(
      buildAsset(
        {
          kind: "cashbook-entry",
          savedAt,
          tag: "Cashbook receipt",
          title: entry.description.trim() || typeLabel,
          subtitle: `${bookTitle} · ${typeLabel}`,
          facts: compactFacts([
            { label: "Amount", value: formatCurrency(entry.amount) },
            { label: "Payment mode", value: entry.paymentMode },
            { label: "Entry date", value: formatStoredDate(entry.date) },
            { label: "Saved", value: formatGalleryDateTime(savedAt) },
          ]),
          target: { kind: "cashbook", cashbookId: entry.cashbookId },
          ref: { kind: "cashbook-entry", entryId: entry.id },
        },
        entry.imageUri,
      ),
    );
  }

  const propertyById = new Map(
    properties.map((property) => [property.id, property]),
  );
  const billById = new Map(billingItems.map((bill) => [bill.id, bill]));
  const monthlyBillByKey = new Map(
    monthlyOnlyBills.map(({ period, bill }) => [`${period}:${bill.id}`, bill]),
  );

  for (const entry of billEntries) {
    const property = propertyById.get(entry.propertyId);
    const bill: BillingItem | undefined =
      billById.get(entry.billingItemId) ??
      monthlyBillByKey.get(`${entry.period}:${entry.billingItemId}`);

    const billName = bill?.name.trim() || "Billing item";
    const propertyName = property?.name.trim() || "Property";
    const periodLabel = formatPeriodLabel(entry.period);

    let buildingId: string | null = null;
    let unitId: string | null = null;
    if (property?.type === "Building") {
      buildingId = property.id;
    } else if (property?.type === "Unit") {
      if (property.parentBuildingId) {
        buildingId = property.parentBuildingId;
      } else {
        unitId = property.id;
      }
    }

    const target = {
      kind: "billing" as const,
      buildingId,
      unitId,
      period: entry.period,
    };
    const billFact = bill?.utilityType
      ? `${billName} · ${bill.utilityType}`
      : billName;

    if (entry.photoUri) {
      const savedAt = savedAtFor(entry.photoUri, entry.createdAt);
      const consumption =
        entry.reading !== undefined && entry.previousReading !== undefined
          ? entry.reading - entry.previousReading
          : undefined;

      add(
        buildAsset(
          {
            kind: "bill-reading",
            savedAt,
            tag: "Meter reading",
            title: billName,
            subtitle: `${propertyName} · ${periodLabel}`,
            facts: compactFacts([
              { label: "Bill", value: billFact },
              { label: "Property", value: propertyName },
              { label: "Billing period", value: periodLabel },
              {
                label: "Reading",
                value: formatReading(entry.reading, bill?.displayUnit),
              },
              {
                label: "Previous reading",
                value: formatReading(entry.previousReading, bill?.displayUnit),
              },
              {
                label: "Consumption",
                value: formatReading(consumption, bill?.displayUnit),
              },
              {
                label: "Amount",
                value:
                  entry.amount === undefined
                    ? null
                    : formatCurrency(entry.amount),
              },
              { label: "Note", value: entry.note },
              { label: "Saved", value: formatGalleryDateTime(savedAt) },
            ]),
            target,
            ref: {
              kind: "bill-reading",
              period: entry.period,
              propertyId: entry.propertyId,
              billingItemId: entry.billingItemId,
            },
          },
          entry.photoUri,
        ),
      );
    }

    if (entry.paymentProofUri) {
      const savedAt = savedAtFor(
        entry.paymentProofUri,
        entry.paidAt ?? entry.createdAt,
      );

      add(
        buildAsset(
          {
            kind: "bill-payment",
            savedAt,
            tag: "Payment proof",
            title: billName,
            subtitle: `${propertyName} · ${periodLabel}`,
            facts: compactFacts([
              { label: "Bill", value: billFact },
              { label: "Property", value: propertyName },
              { label: "Billing period", value: periodLabel },
              {
                label: "Amount",
                value:
                  entry.amount === undefined
                    ? null
                    : formatCurrency(entry.amount),
              },
              { label: "Paid on", value: formatStoredDate(entry.paidAt) },
              { label: "Payment mode", value: entry.paymentMode },
              {
                label: "Payment note",
                value: entry.paymentDescription ?? "",
              },
              { label: "Saved", value: formatGalleryDateTime(savedAt) },
            ]),
            target,
            ref: {
              kind: "bill-payment",
              period: entry.period,
              propertyId: entry.propertyId,
              billingItemId: entry.billingItemId,
            },
          },
          entry.paymentProofUri,
        ),
      );
    }
  }

  return assets;
}

/**
 * Removes one photo from the gallery and clears the field that referenced it.
 * The repositories delete the file when it no longer belongs to a record.
 */
export async function deleteGalleryAsset(asset: GalleryAsset): Promise<void> {
  const ref = asset.ref;

  switch (ref.kind) {
    case "property-photo": {
      const property = (await getProperties()).find(
        (item) => item.id === ref.propertyId,
      );
      if (!property) break;

      const remaining = property.photos.filter(
        (photo) => photo !== asset.storedPath,
      );
      if (remaining.length === property.photos.length) break;
      await savePropertyRecord({ ...property, photos: remaining });
      return;
    }

    case "tenant-photo":
    case "tenant-id": {
      const tenant = (await getTenants()).find(
        (item) => item.id === ref.tenantId,
      );
      if (!tenant) break;

      if (ref.kind === "tenant-photo") {
        if (tenant.photo !== asset.storedPath) break;
        await saveTenantRecord({ ...tenant, photo: null });
      } else {
        if (tenant.idPhoto !== asset.storedPath) break;
        await saveTenantRecord({ ...tenant, idPhoto: null });
      }
      return;
    }

    case "cashbook-entry": {
      const entry = (await getCashbookEntries()).find(
        (item) => item.id === ref.entryId,
      );
      if (!entry || entry.imageUri !== asset.storedPath) break;
      await saveCashbookEntry({ ...entry, imageUri: undefined });
      return;
    }

    case "bill-reading": {
      const cleared = await clearMonthlyBillPhoto({
        period: ref.period,
        propertyId: ref.propertyId,
        billingItemId: ref.billingItemId,
      });
      if (cleared) return;
      break;
    }

    case "bill-payment": {
      const cleared = await clearMonthlyBillPaymentProof({
        period: ref.period,
        propertyId: ref.propertyId,
        billingItemId: ref.billingItemId,
      });
      if (cleared) return;
      break;
    }
  }

  // The owning record is gone or no longer references this file.
  deleteStoredPhoto(asset.storedPath);
}
