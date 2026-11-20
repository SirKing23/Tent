import { buildPlaceholders, getDatabase } from "./db";
import { deleteStoredPhoto } from "./photoStorage";

export type PropertyType = "Building" | "Unit";

export type Property = {
  id: string;
  name: string;
  type: PropertyType;
  parentBuildingId: string | null;
  // Address fields
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  country: string;
  // Photos (stored as JSON array of app-private paths)
  photos: string[];
  // Relations (stored as JSON arrays of IDs)
  billIds: string[];
  subMeterBillIds: string[];
  tenantIds: string[];
  createdAt: string;
};

type PropertyRow = {
  id: string;
  name: string;
  type: PropertyType;
  parent_building_id: string | null;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zip_code: string;
  country: string;
  photos: string;
  bill_ids: string;
  sub_meter_bill_ids: string;
  tenant_ids: string;
  created_at: string;
};

const mapPropertyRow = (row: PropertyRow): Property => ({
  id: row.id,
  name: row.name,
  type: row.type,
  parentBuildingId: row.parent_building_id,
  street: row.street,
  barangay: row.barangay,
  city: row.city,
  province: row.province,
  zipCode: row.zip_code,
  country: row.country,
  photos: JSON.parse(row.photos || "[]") as string[],
  billIds: JSON.parse(row.bill_ids || "[]") as string[],
  subMeterBillIds: JSON.parse(row.sub_meter_bill_ids || "[]") as string[],
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
      street, barangay, city, province, zip_code, country,
      photos, bill_ids, sub_meter_bill_ids, tenant_ids, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      parent_building_id = excluded.parent_building_id,
      street = excluded.street,
      barangay = excluded.barangay,
      city = excluded.city,
      province = excluded.province,
      zip_code = excluded.zip_code,
      country = excluded.country,
      photos = excluded.photos,
      bill_ids = excluded.bill_ids,
      sub_meter_bill_ids = excluded.sub_meter_bill_ids,
      tenant_ids = excluded.tenant_ids,
      created_at = excluded.created_at`,
    property.id,
    property.name,
    property.type,
    property.parentBuildingId ?? null,
    property.street,
    property.barangay,
    property.city,
    property.province,
    property.zipCode,
    property.country,
    JSON.stringify(property.photos),
    JSON.stringify(property.billIds),
    JSON.stringify(property.subMeterBillIds),
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

