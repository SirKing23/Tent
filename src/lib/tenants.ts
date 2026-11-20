import { getDatabase } from "./db";
import { deleteStoredPhoto } from "./photoStorage";

export type TenantStatus = "Active" | "Inactive" | "Reserved";

export type Tenant = {
  id: string;
  tenantStatus: TenantStatus;
  photo: string | null;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  email: string;
  idType: string;
  idNumber: string;
  idPhoto: string | null;
};

type TenantRow = {
  id: string;
  tenant_status: TenantStatus;
  photo: string | null;
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  email: string;
  id_type: string;
  id_number: string;
  id_photo: string | null;
};

const mapTenantRow = (row: TenantRow): Tenant => ({
  id: row.id,
  tenantStatus: row.tenant_status,
  photo: row.photo,
  firstName: row.first_name,
  middleName: row.middle_name,
  lastName: row.last_name,
  phone: row.phone,
  email: row.email,
  idType: row.id_type,
  idNumber: row.id_number,
  idPhoto: row.id_photo,
});

export async function getTenants(): Promise<Tenant[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<TenantRow>(
      "SELECT * FROM tenants ORDER BY rowid DESC",
    );
    return rows.map(mapTenantRow);
  } catch (error) {
    console.error("Unable to load tenants:", error);
    return [];
  }
}

export async function saveTenantRecord(tenant: Tenant): Promise<void> {
  const db = await getDatabase();

  const previous = await db.getFirstAsync<{
    photo: string | null;
    id_photo: string | null;
  }>("SELECT photo, id_photo FROM tenants WHERE id = ?", tenant.id);

  await db.runAsync(
    `INSERT INTO tenants (
      id, tenant_status, photo, first_name, middle_name, last_name, phone,
      email, id_type, id_number, id_photo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      tenant_status = excluded.tenant_status,
      photo = excluded.photo,
      first_name = excluded.first_name,
      middle_name = excluded.middle_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      email = excluded.email,
      id_type = excluded.id_type,
      id_number = excluded.id_number,
      id_photo = excluded.id_photo`,
    tenant.id,
    tenant.tenantStatus,
    tenant.photo,
    tenant.firstName,
    tenant.middleName,
    tenant.lastName,
    tenant.phone,
    tenant.email,
    tenant.idType,
    tenant.idNumber,
    tenant.idPhoto,
  );

  // Drop files that this edit replaced or removed from the record.
  if (previous?.photo && previous.photo !== tenant.photo) {
    deleteStoredPhoto(previous.photo);
  }
  if (previous?.id_photo && previous.id_photo !== tenant.idPhoto) {
    deleteStoredPhoto(previous.id_photo);
  }
}

export async function deleteTenantRecord(id: string): Promise<void> {
  const db = await getDatabase();
  const previous = await db.getFirstAsync<{
    photo: string | null;
    id_photo: string | null;
  }>("SELECT photo, id_photo FROM tenants WHERE id = ?", id);

  await db.runAsync("DELETE FROM tenants WHERE id = ?", id);

  deleteStoredPhoto(previous?.photo);
  deleteStoredPhoto(previous?.id_photo);
}
