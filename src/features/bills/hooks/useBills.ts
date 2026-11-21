import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import {
  deleteBillingItems,
  getBillingItems,
} from "../services/billingRepository";
import type { BillingItem } from "../types";

/** Billing-item list state: load on focus, refresh, and guarded deletes. */
export function useBills() {
  const [bills, setBills] = useState<BillingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setBills(await getBillingItems());
    setIsLoading(false);
  }, []);

  useFocusReload(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const remove = useCallback(
    async (ids: string[]) => {
      const blockedIds = await deleteBillingItems(ids);
      await refresh();
      return blockedIds;
    },
    [refresh],
  );

  return { bills, isLoading, refresh, remove };
}
