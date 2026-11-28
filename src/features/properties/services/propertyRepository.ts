import { getDatabase } from "../../../services/database";
import { deleteStoredPhoto } from "../../../services/photoStorage";
import type { Property, PropertyType } from "../types";

type PropertyRow = {
  id: string;
  name: string;
  type: PropertyType;
  parent_building_id: string | null;
  street: string;
  street2: string;
  barangay: string;
  city: string;
  province: string;
  zip_code: string;
  country: string;
  photos: string;
  bill_ids: string;
  sub_meter_bill_ids: string;
  fixed_bill_shares: string;
  tenant_ids: string;
  created_at: string;
};

const parseFixedBillShares = (raw: string): Record<string, number> => {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const shares: Record<string, number> = {};
    for (const [billId, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        shares[billId] = value;
      }
    }
    return shares;
  } catch {
    return {};
  }
};

const mapPropertyRow = (row: PropertyRow): Property => ({
  id: row.id,
  name: row.name,
  type: row.type,
  parentBuildingId: row.parent_building_id,
  street: row.street,
  street2: row.street2 ?? "",
  barangay: row.barangay,
  city: row.city,
  province: row.province,
  zipCode: row.zip_code,
  country: row.country,
  photos: JSON.parse(row.photos || "[]") as string[],
  billIds: JSON.parse(row.bill_ids || "[]") as string[],
  subMeterBillIds: JSON.parse(row.sub_meter_bill_ids || "[]") as string[],
  fixedBillShares: parseFixedBillShares(row.fixed_bill_shares),
  tenantIds: JSON.parse(row.tenant_ids || "[]") as string[],
  createdAt: row.created_at,
});

export async function getProperties(): Promise<Property[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<PropertyRow>(
      "SELECT * FROM properties ORDER BY rowid DESC",
    );
    return rows.map(mapPropertyRow);
  } catch (error) {
    console.error("Unable to load properties:", error);
    return [];
  }
}

export async function getBuildings(): Promise<Property[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<PropertyRow>(
      "SELECT * FROM properties WHERE type = 'Building' ORDER BY rowid DESC",
    );
    return rows.map(mapPropertyRow);
  } catch (error) {
    console.error("Unable to load buildings:", error);
    return [];
  }
}

/** Units that list the given property as their parent building. */
export async function getChildUnits(buildingId: string): Promise<Property[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<PropertyRow>(
      "SELECT * FROM properties WHERE parent_building_id = ? ORDER BY rowid DESC",
      buildingId,
    );
    return rows.map(mapPropertyRow);
  } catch (error) {
    console.error("Unable to load child units:", error);
    return [];
  }
}

export async function savePropertyRecord(property: Property): Promise<void> {
  const db = await getDatabase();

  const previous = await db.getFirstAsync<{ photos: string }>(
    "SELECT photos FROM properties WHERE id = ?",
    property.id,
  );
  const previousPhotos = previous
    ? (JSON.parse(previous.photos || "[]") as string[])
    : [];

  await db.runAsync(
    `INSERT INTO properties (
      id, name, type, parent_building_id,
      street, street2, barangay, city, province, zip_code, country,
      photos, bill_ids, sub_meter_bill_ids, fixed_bill_shares, tenant_ids,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      parent_building_id = excluded.parent_building_id,
      street = excluded.street,
      street2 = excluded.street2,
      barangay = excluded.barangay,
      city = excluded.city,
      province = excluded.province,
      zip_code = excluded.zip_code,
      country = excluded.country,
      photos = excluded.photos,
      bill_ids = excluded.bill_ids,
      sub_meter_bill_ids = excluded.sub_meter_bill_ids,
      fixed_bill_shares = excluded.fixed_bill_shares,
      tenant_ids = excluded.tenant_ids,
      created_at = excluded.created_at`,
    property.id,
    property.name,
    property.type,
    property.parentBuildingId ?? null,
    property.street,
    property.street2,
    property.barangay,
    property.city,
    property.province,
    property.zipCode,
    property.country,
    JSON.stringify(property.photos),
    JSON.stringify(property.billIds),
    JSON.stringify(property.subMeterBillIds),
    JSON.stringify(property.fixedBillShares),
    JSON.stringify(property.tenantIds),
    property.createdAt,
  );

  // Drop files that this edit removed from the record.
  previousPhotos
    .filter((photo) => !property.photos.includes(photo))
    .forEach(deleteStoredPhoto);
}

export async function deletePropertyRecord(id: string): Promise<void> {
  const db = await getDatabase();
  const previous = await db.getFirstAsync<{ photos: string }>(
    "SELECT photos FROM properties WHERE id = ?",
    id,
  );

  await db.runAsync("DELETE FROM properties WHERE id = ?", id);

  ((previous ? JSON.parse(previous.photos || "[]") : []) as string[]).forEach(
    deleteStoredPhoto,
  );
}

