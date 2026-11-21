import { useCallback, useMemo, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import {
  computeCashbookTotals,
  type CashbookTotals,
} from "../logic/cashbookCalculations";
import {
  deleteCashbookEntries,
  getEntriesForCashbook,
  saveCashbookEntry,
} from "../services/cashbookEntryRepository";
import { getCashbooks } from "../services/cashbookRepository";
import { persistPhoto } from "../../../services/photoStorage";
import type { Cashbook, CashbookEntry } from "../types";

/** Cash-book inbox: book header, entries, totals, and entry operations. */
export function useCashbookEntries(cashbookId: string | undefined) {
  const [book, setBook] = useState<Cashbook | undefined>();
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!cashbookId) return;
    setIsLoading(true);
    const [cashbooks, bookEntries] = await Promise.all([
      getCashbooks(),
      getEntriesForCashbook(cashbookId),
    ]);
    setBook(cashbooks.find((item) => item.id === cashbookId));
    setEntries(bookEntries);
    setIsLoading(false);
  }, [cashbookId]);

  useFocusReload(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const totals: CashbookTotals = useMemo(
    () =>
      computeCashbookTotals(
        {
          initialCashIn: book?.initialCashIn ?? 0,
          initialCashOut: book?.initialCashOut ?? 0,
        },
        entries,
      ),
    [book, entries],
  );

  const remove = useCallback(
    async (ids: string[]) => {
      await deleteCashbookEntries(ids);
      await refresh();
    },
    [refresh],
  );

  /** Copies a picked photo into app storage and attaches it to the entry. */
  const attachImage = useCallback(
    async (entry: CashbookEntry, imageUri: string) => {
      const storedImageUri = await persistPhoto(imageUri, "entry-photo");
      await saveCashbookEntry({
        ...entry,
        imageUri: storedImageUri ?? undefined,
      });
      await refresh();
    },
    [refresh],
  );

  return {
    book,
    bookTitle: book?.title ?? "Cash Book",
    entries,
    totals,
    isLoading,
    refresh,
    remove,
    attachImage,
  };
}
