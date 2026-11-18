import AsyncStorage from "@react-native-async-storage/async-storage";

export const TENANTS_STORAGE_KEY = "@tenants";

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

const isTenant = (value: unknown): value is Tenant => {
  if (!value || typeof value !== "object") return false;
  const tenant = value as Partial<Tenant>;
  return (
    typeof tenant.id === "string" &&
    (tenant.tenantStatus === "Active" ||
      tenant.tenantStatus === "Inactive" ||
      tenant.tenantStatus === "Reserved") &&
    (typeof tenant.photo === "string" || tenant.photo === null) &&
    typeof tenant.firstName === "string" &&
    typeof tenant.middleName === "string" &&
    typeof tenant.lastName === "string" &&
    typeof tenant.phone === "string" &&
    typeof tenant.email === "string" &&
    typeof tenant.idType === "string" &&
    typeof tenant.idNumber === "string" &&
    (typeof tenant.idPhoto === "string" || tenant.idPhoto === null)
  );
};

export async function getTenants(): Promise<Tenant[]> {
  try {
    const raw = await AsyncStorage.getItem(TENANTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTenant) : [];
  } catch (error) {
    console.error("Unable to load tenants:", error);
    return [];
  }
}

export async function saveTenantRecord(tenant: Tenant): Promise<void> {
  const tenants = await getTenants();
  const existingIndex = tenants.findIndex((current) => current.id === tenant.id);
  if (existingIndex >= 0) tenants[existingIndex] = tenant;
  else tenants.unshift(tenant);
  await AsyncStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(tenants));
}

export async function deleteTenantRecord(id: string): Promise<void> {
  const tenants = await getTenants();
  await AsyncStorage.setItem(
    TENANTS_STORAGE_KEY,
    JSON.stringify(tenants.filter((tenant) => tenant.id !== id)),
  );
}
