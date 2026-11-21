import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import {
  deleteTenantRecord,
  getTenants,
} from "../services/tenantRepository";
import type { Tenant } from "../types";

/** Tenant directory: load on focus and delete with refresh. */
export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const refresh = useCallback(async () => {
    setTenants(await getTenants());
  }, []);

  useFocusReload(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const remove = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteTenantRecord(id)));
      await refresh();
    },
    [refresh],
  );

  return { tenants, refresh, remove };
}
