import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import { getTenants } from "../../tenants/services/tenantRepository";
import type { Tenant } from "../../tenants/types";
import {
  getChildUnits,
  getProperties,
} from "../services/propertyRepository";
import type { Property } from "../types";

/** Parent building and its child units for the Units screen. */
export function useBuildingUnits(buildingId: string | undefined) {
  const [building, setBuilding] = useState<Property | null>(null);
  const [units, setUnits] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useFocusReload(
    useCallback(() => {
      let active = true;
      void (async () => {
        if (!buildingId) return;
        const [properties, childUnits, tenantsData] = await Promise.all([
          getProperties(),
          getChildUnits(buildingId),
          getTenants(),
        ]);
        if (!active) return;
        setBuilding(properties.find((item) => item.id === buildingId) ?? null);
        setUnits(childUnits);
        setTenants(tenantsData);
      })();
      return () => {
        active = false;
      };
    }, [buildingId]),
  );

  return { building, units, tenants };
}
