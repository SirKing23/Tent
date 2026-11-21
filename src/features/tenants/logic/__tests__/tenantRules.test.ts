import {
  countTenantsByStatus,
  filterTenants,
  getTenantInitials,
  getTenantName,
  validateTenantDraft,
} from "../tenantRules";
import type { Tenant, TenantDraft } from "../../types";

const tenant = (overrides: Partial<Tenant> = {}): Tenant => ({
  id: "tenant-1",
  tenantStatus: "Active",
  photo: null,
  firstName: "Ana",
  middleName: "",
  lastName: "Cruz",
  phone: "09170000000",
  email: "ana@example.com",
  idType: "PhilHealth ID",
  idNumber: "12-345",
  idPhoto: null,
  ...overrides,
});

const draft = (overrides: Partial<TenantDraft> = {}): TenantDraft => ({
  tenantStatus: "Active",
  photo: null,
  firstName: "Ana",
  middleName: "",
  lastName: "Cruz",
  phone: "09170000000",
  email: "ana@example.com",
  idType: "PhilHealth ID",
  idNumber: "12-345",
  idPhoto: null,
  ...overrides,
});

describe("tenant display helpers", () => {
  it("joins available name parts", () => {
    expect(getTenantName(tenant())).toBe("Ana Cruz");
    expect(getTenantName(tenant({ middleName: "Santos" }))).toBe(
      "Ana Santos Cruz",
    );
  });

  it("builds initials from first and last name", () => {
    expect(getTenantInitials(tenant())).toBe("AC");
    expect(getTenantInitials(tenant({ firstName: "" }))).toBe("C");
  });
});

describe("countTenantsByStatus", () => {
  it("counts every known status, including zeroes", () => {
    expect(
      countTenantsByStatus([
        tenant({ id: "1", tenantStatus: "Active" }),
        tenant({ id: "2", tenantStatus: "Active" }),
        tenant({ id: "3", tenantStatus: "Inactive" }),
      ]),
    ).toEqual({ Active: 2, Inactive: 1, Reserved: 0 });
  });
});

describe("filterTenants", () => {
  it("searches name, phone, and email", () => {
    const tenants = [
      tenant({ id: "a" }),
      tenant({
        id: "b",
        firstName: "Ben",
        lastName: "Reyes",
        phone: "09185555555",
        email: "ben@example.com",
      }),
    ];
    expect(filterTenants(tenants, "cruz").map((item) => item.id)).toEqual([
      "a",
    ]);
    expect(filterTenants(tenants, "0917").map((item) => item.id)).toEqual([
      "a",
    ]);
    expect(filterTenants(tenants, "ana@").map((item) => item.id)).toEqual([
      "a",
    ]);
    expect(filterTenants(tenants, "")).toHaveLength(2);
  });
});

describe("validateTenantDraft", () => {
  it("requires name, phone, and valid ID details", () => {
    expect(validateTenantDraft(draft())).toEqual({ valid: true });
    expect(
      validateTenantDraft(draft({ firstName: "  " })),
    ).toMatchObject({ valid: false, title: "Missing information" });
    expect(validateTenantDraft(draft({ phone: "" }))).toMatchObject({
      valid: false,
    });
    expect(validateTenantDraft(draft({ idNumber: "" }))).toMatchObject({
      valid: false,
    });
  });
});
