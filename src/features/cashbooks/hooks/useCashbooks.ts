import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import {
  computeEntryBalances,
} from "../logic/cashbookCalculations";
import { getCashbookEntries } from "../services/cashbookEntryRepository";
import {
  deleteCashbooks,
  getCashbooks,
} from "../services/cashbookRepository";
import type { Cashbook } from "../types";

/** Cash-book list with each book's net entry balance. */
export function useCashbooks() {
  const [cashbooks, setCashbooks] = useState<Cashbook[]>([]);
  const [entryBalances, setEntryBalances] = useState<Record<string, number>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [loadedCashbooks, entries] = await Promise.all([
      getCashbooks(),
      getCashbookEntries(),
    ]);
    setCashbooks(loadedCashbooks);
    setEntryBalances(computeEntryBalances(entries));
    setIsLoading(false);
  }, []);

  useFocusReload(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const remove = useCallback(
    async (ids: string[]) => {
      await deleteCashbooks(ids);
      await refresh();
    },
    [refresh],
  );

  return { cashbooks, entryBalances, isLoading, refresh, remove };
}
