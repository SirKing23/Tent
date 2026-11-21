import type { ValidationResult } from "../../../types/validation";
import { parseAmount } from "../../../utils/number";

export const validateCashbookDraft = (title: string): ValidationResult => {
  if (!title.trim()) {
    return {
      valid: false,
      title: "Title required",
      message: "Please enter a name for this cash book.",
    };
  }
  return { valid: true };
};

export type CashbookEntryValidation =
  | { valid: true; amount: number; cashbookId: string }
  | { valid: false; title: string; message: string };

export const validateCashbookEntry = ({
  rawAmount,
  selectedCashbookId,
  isSelectingCashbook,
}: {
  rawAmount: string;
  selectedCashbookId: string | undefined;
  isSelectingCashbook: boolean;
}): CashbookEntryValidation => {
  if (!selectedCashbookId) {
    return {
      valid: false,
      title: "Cash book required",
      message: isSelectingCashbook
        ? "Please select a cash book before saving this entry."
        : "Open this form from a cash book.",
    };
  }

  const amount = parseAmount(rawAmount);
  if (amount <= 0) {
    return {
      valid: false,
      title: "Amount required",
      message: "Enter an amount greater than zero.",
    };
  }

  return { valid: true, amount, cashbookId: selectedCashbookId };
};
