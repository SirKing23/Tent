import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import { getBillingItems } from "../../bills/services/billingRepository";
import type { BillingItem } from "../../bills/types";
import { getTenants } from "../../tenants/services/tenantRepository";
import type { Tenant } from "../../tenants/types";
import {
  resolvePropertySummary,
  type PropertySummary,
} from "../logic/propertyRules";
import {
  getBuildings,
  getProperties,
} from "../services/propertyRepository";
import type { Property } from "../types";

/** Property summary: property plus its linked bills, tenants, and parent. */
export function usePropertySummary(id: string | undefined) {
  const [property, setProperty] = useState<Property | null>(null);
  const [bills, setBills] = useState<BillingItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Property[]>([]);

  useFocusReload(
    useCallback(() => {
      void (async () => {
        const [propertiesData, billsData, tenantsData, buildingsData] =
          await Promise.all([
            getProperties(),
            getBillingItems(),
            getTenants(),
            getBuildings(),
          ]);
        setProperty(propertiesData.find((item) => item.id === id) ?? null);
        setBills(billsData);
        setTenants(tenantsData);
        setBuildings(buildingsData);
      })();
    }, [id]),
  );

  const summary: PropertySummary = resolvePropertySummary({
    property,
    bills,
    tenants,
    buildings,
  });

  return { property, summary };
}
