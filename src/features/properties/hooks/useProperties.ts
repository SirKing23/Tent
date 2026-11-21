import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import {
  deletePropertyRecord,
  getProperties,
} from "../services/propertyRepository";
import type { Property } from "../types";

/** Property directory: load on focus, refresh, and delete. */
export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);

  const refresh = useCallback(async () => {
    setProperties(await getProperties());
  }, []);

  useFocusReload(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const remove = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => deletePropertyRecord(id)));
      await refresh();
    },
    [refresh],
  );

  return { properties, refresh, remove };
}
