import { TENANT_STATUSES } from "../../../constants/tenants";

export type TenantStatus = (typeof TENANT_STATUSES)[number];

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

/** Editable tenant fields (everything except the persisted id). */
export type TenantDraft = Omit<Tenant, "id">;
