import { useEffect, useState } from "react";

import { persistPhoto } from "../../../services/photoStorage";
import { createTimestampId } from "../../../utils/id";
import type { ValidationResult } from "../../../types/validation";
import { validateCashbookEntry } from "../logic/cashbookValidation";
import {
  getCashbookEntries,
  saveCashbookEntry,
} from "../services/cashbookEntryRepository";
import { getCashbooks } from "../services/cashbookRepository";
import type { Cashbook, CashbookEntryType } from "../types";

const PAYMENT_MODES = [
  "Cash",
  "Bank transfer",
  "GCash",
  "Credit card",
  "Other",
];

/** Create/edit cash-book entry form, including its cash-book choice. */
export function useCashbookEntryForm({
  cashbookId,
  entryId,
  type,
  isSelectingCashbook,
}: {
  cashbookId?: string;
  entryId?: string;
  type?: CashbookEntryType;
  isSelectingCashbook: boolean;
}) {
  const [cashbooks, setCashbooks] = useState<Cashbook[]>([]);
  const [selectedCashbookId, setSelectedCashbookId] = useState<
    string | undefined
  >(cashbookId);
  const [entryType, setEntryType] = useState<CashbookEntryType>(
    type === "cashOut" ? "cashOut" : "cashIn",
  );
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES[0]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [createdAt, setCreatedAt] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void Promise.all([getCashbooks(), getCashbookEntries()]).then(
      ([loadedCashbooks, entries]) => {
        setCashbooks(loadedCashbooks);
        const initialCashbookId = cashbookId ?? undefined;
        setSelectedCashbookId(initialCashbookId);

        if (!entryId) return;
        const entry = entries.find((item) => item.id === entryId);
        if (!entry) return;
        setEntryType(entry.type);
        setAmount(String(entry.amount));
        setPaymentMode(entry.paymentMode);
        setDescription(entry.description);
        setDate(entry.date ? new Date(entry.date) : new Date());
        setImageUri(entry.imageUri);
        setCreatedAt(entry.createdAt);
      },
    );
  }, [cashbookId, entryId]);

  const cashbookTitle =
    cashbooks.find((item) => item.id === selectedCashbookId)?.title ??
    "Cash book";

  const save = async (): Promise<ValidationResult> => {
    const validation = validateCashbookEntry({
      rawAmount: amount,
      selectedCashbookId,
      isSelectingCashbook,
    });
    if (!validation.valid) return validation;

    setIsSaving(true);
    try {
      // Keep the receipt photo in app-private storage instead of the
      // temporary image-picker cache.
      const storedImageUri = await persistPhoto(imageUri, "entry-photo");

      await saveCashbookEntry({
        id: entryId ?? createTimestampId(),
        cashbookId: validation.cashbookId,
        type: entryType,
        amount: validation.amount,
        paymentMode,
        description: description.trim(),
        date: date.toISOString(),
        imageUri: storedImageUri ?? undefined,
        createdAt: createdAt ?? new Date().toISOString(),
      });
      return validation;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    cashbooks,
    cashbookTitle,
    selectedCashbookId,
    setSelectedCashbookId,
    entryType,
    setEntryType,
    amount,
    setAmount,
    paymentMode,
    setPaymentMode,
    description,
    setDescription,
    date,
    setDate,
    imageUri,
    setImageUri,
    isSaving,
    save,
    paymentModes: PAYMENT_MODES,
  };
}
