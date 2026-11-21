import { useCallback, useState } from "react";

import { useFocusReload } from "../../../hooks/useFocusReload";
import type { ValidationResult } from "../../../types/validation";
import { createTimestampId } from "../../../utils/id";
import { parseAmount } from "../../../utils/number";
import { validateCashbookDraft } from "../logic/cashbookValidation";
import {
  getCashbooks,
  saveCashbook,
} from "../services/cashbookRepository";
import type { Cashbook } from "../types";

type CashbookDraft = {
  title: string;
  description: string;
  initialCashIn: string;
  initialCashOut: string;
  autoCreateMonthly: boolean;
};

const EMPTY_CASHBOOK_DRAFT: CashbookDraft = {
  title: "",
  description: "",
  initialCashIn: "",
  initialCashOut: "",
  autoCreateMonthly: false,
};

export type CashbookLoadError = "not-found" | "failed" | null;

/** Create/edit cash-book form. */
export function useCashbookForm(id?: string) {
  const [draft, setDraft] = useState<CashbookDraft>(EMPTY_CASHBOOK_DRAFT);
  const [date, setDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<CashbookLoadError>(null);

  useFocusReload(
    useCallback(() => {
      if (!id) return;
      void (async () => {
        try {
          const cashbooks = await getCashbooks();
          const cashbook = cashbooks.find((item) => item.id === id);
          if (!cashbook) {
            setLoadError("not-found");
            return;
          }
          setDraft({
            title: cashbook.title,
            description: cashbook.description,
            initialCashIn: String(cashbook.initialCashIn ?? 0),
            initialCashOut: String(cashbook.initialCashOut ?? 0),
            autoCreateMonthly: cashbook.autoCreateMonthly ?? false,
          });
          setDate(cashbook.date ? new Date(cashbook.date) : new Date());
          setLoadError(null);
        } catch (error) {
          console.error("Unable to load cash book:", error);
          setLoadError("failed");
        } finally {
          setIsLoading(false);
        }
      })();
    }, [id]),
  );

  const update = useCallback(
    <K extends keyof CashbookDraft>(field: K, value: CashbookDraft[K]) =>
      setDraft((current) => ({ ...current, [field]: value })),
    [],
  );

  const save = useCallback(async (): Promise<ValidationResult> => {
    const validation = validateCashbookDraft(draft.title);
    if (!validation.valid) return validation;

    setIsSaving(true);
    try {
      const existing: Cashbook | undefined = id
        ? (await getCashbooks()).find((item) => item.id === id)
        : undefined;

      await saveCashbook({
        id: id ?? createTimestampId(),
        title: draft.title.trim(),
        description: draft.description.trim(),
        initialCashIn: parseAmount(draft.initialCashIn),
        initialCashOut: parseAmount(draft.initialCashOut),
        date: date.toISOString(),
        autoCreateMonthly: draft.autoCreateMonthly,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      });
      return validation;
    } finally {
      setIsSaving(false);
    }
  }, [date, draft, id]);

  return { draft, update, date, setDate, save, isSaving, isLoading, loadError };
}
