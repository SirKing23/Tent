import { TENANT_STATUSES } from "../../../constants/tenants";
import type { ValidationResult } from "../../../types/validation";
import { getInitials } from "../../../utils/text";

import type { Tenant, TenantDraft, TenantStatus } from "../types";

type TenantNameSource = Pick<Tenant, "firstName" | "middleName" | "lastName">;

/** Full name without stray spaces, e.g. `Ana Cruz`. */
export const getTenantName = (tenant: TenantNameSource): string =>
  [tenant.firstName, tenant.middleName, tenant.lastName]
    .filter(Boolean)
    .join(" ");

export const getTenantInitials = (tenant: TenantNameSource): string =>
  getInitials(tenant.firstName, tenant.lastName);

export const countTenantsByStatus = (
  tenants: readonly Tenant[],
): Record<TenantStatus, number> =>
  TENANT_STATUSES.reduce(
    (counts, status) => ({
      ...counts,
      [status]: tenants.filter((tenant) => tenant.tenantStatus === status)
        .length,
    }),
    {} as Record<TenantStatus, number>,
  );

export const filterTenants = (
  tenants: readonly Tenant[],
  query: string,
): Tenant[] => {
  const search = query.trim().toLowerCase();
  if (!search) return [...tenants];
  return tenants.filter((tenant) =>
    [getTenantName(tenant), tenant.phone, tenant.email]
      .join(" ")
      .toLowerCase()
      .includes(search),
  );
};

export const validateTenantDraft = (
  draft: TenantDraft,
): ValidationResult => {
  if (
    !draft.firstName.trim() ||
    !draft.lastName.trim() ||
    !draft.phone.trim() ||
    !draft.idType.trim() ||
    !draft.idNumber.trim()
  ) {
    return {
      valid: false,
      title: "Missing information",
      message:
        "Add first name, last name, cellphone number, and valid ID information.",
    };
  }
  return { valid: true };
};
