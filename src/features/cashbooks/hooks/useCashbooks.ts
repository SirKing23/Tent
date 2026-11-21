import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import {
  computeCashbookSummary,
  computeEntryBalances,
} from "../logic/cashbookCalculations";
import type { CashbookSummary } from "../logic/cashbookCalculations";
import { getCashbookEntries } from "../services/cashbookEntryRepository";
import {
  deleteCashbooks,
  getCashbooks,
} from "../services/cashbookRepository";
import type { Cashbook } from "../types";

const EMPTY_SUMMARY: CashbookSummary = {
  totalCashIn: 0,
  totalCashOut: 0,
  balance: 0,
};

/** Cash-book list with each book's net entry balance and a combined summary. */
export function useCashbooks() {
  const [cashbooks, setCashbooks] = useState<Cashbook[]>([]);
  const [entryBalances, setEntryBalances] = useState<Record<string, number>>(
    {},
  );
  const [summary, setSummary] = useState<CashbookSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [loadedCashbooks, entries] = await Promise.all([
      getCashbooks(),
      getCashbookEntries(),
    ]);
    setCashbooks(loadedCashbooks);
    setEntryBalances(computeEntryBalances(entries));
    setSummary(computeCashbookSummary(loadedCashbooks, entries));
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

  return { cashbooks, entryBalances, summary, isLoading, refresh, remove };
}
