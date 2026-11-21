import { useCallback, useState } from "react";

import {
  BILLING_TYPES,
  DUE_DATE_TYPES,
  RECURRING_RULES,
  UTILITY_TYPES,
} from "../../../constants/bills";
import { useFocusReload } from "../../../hooks/useFocusReload";
import type { ValidationResult } from "../../../types/validation";
import {
  buildBillingItem,
  validateBillingDraft,
} from "../logic/billingRules";
import {
  getMonthlyOnlyBills,
  saveMonthlyOnlyBill,
} from "../../monthlyBilling/services/monthlyBillItemsRepository";
import {
  getBillingItems,
  saveBillingItem,
} from "../services/billingRepository";
import type { BillingDraft } from "../types";

export type BillFormMonthlyContext = {
  period: string;
  propertyId: string;
};

const EMPTY_BILLING_DRAFT: BillingDraft = {
  name: "",
  utilityType: UTILITY_TYPES[0],
  billingType: BILLING_TYPES[0],
  displayUnit: "",
  defaultAmount: "",
  dueDateType: DUE_DATE_TYPES[0],
  fixedDueDate: "",
  recurringRule: RECURRING_RULES[0],
  recurringDay: "",
};

/**
 * Billing form state. Loads the item being edited, validates the draft with
 * the pure rules, and persists it with the repository.
 */
export function useBillForm(
  id?: string,
  monthlyContext?: BillFormMonthlyContext,
) {
  const [draft, setDraft] = useState<BillingDraft>(EMPTY_BILLING_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const monthlyPeriod = monthlyContext?.period;
  const monthlyPropertyId = monthlyContext?.propertyId;

  useFocusReload(
    useCallback(() => {
      if (!id) return;
      void (async () => {
        const item =
          monthlyPeriod && monthlyPropertyId
            ? (
                await getMonthlyOnlyBills(monthlyPeriod)
              ).find(
                (current) =>
                  current.propertyId === monthlyPropertyId &&
                  current.bill.id === id,
              )?.bill
            : (await getBillingItems()).find(
                (current) => current.id === id,
              );
        if (!item) return;
        setDraft({
          name: item.name,
          utilityType: item.utilityType ?? "Other bills",
          billingType: item.billingType,
          displayUnit: item.displayUnit,
          defaultAmount: item.defaultAmount?.toString() ?? "",
          dueDateType: item.dueDateType,
          fixedDueDate: item.fixedDueDate ?? "",
          recurringRule: item.recurringRule ?? RECURRING_RULES[0],
          recurringDay: item.recurringDay?.toString() ?? "",
        });
      })();
    }, [id, monthlyPeriod, monthlyPropertyId]),
  );

  const update = useCallback(
    <K extends keyof BillingDraft>(field: K, value: BillingDraft[K]) =>
      setDraft((current) => ({ ...current, [field]: value })),
    [],
  );

  /** Returns the validation result; `valid: true` means it was persisted. */
  const save = useCallback(async (): Promise<ValidationResult> => {
    const validation = validateBillingDraft(draft);
    if (!validation.valid) return validation;

    setIsSaving(true);
    try {
      const existing = id
        ? monthlyPeriod && monthlyPropertyId
          ? (
              await getMonthlyOnlyBills(monthlyPeriod)
            ).find(
              (item) =>
                item.propertyId === monthlyPropertyId && item.bill.id === id,
            )?.bill
          : (await getBillingItems()).find((item) => item.id === id)
        : undefined;
      const bill = buildBillingItem({
        draft,
        id,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      });
      if (monthlyPeriod && monthlyPropertyId) {
        await saveMonthlyOnlyBill({
          bill,
          period: monthlyPeriod,
          propertyId: monthlyPropertyId,
        });
      } else {
        await saveBillingItem(bill);
      }
      return validation;
    } finally {
      setIsSaving(false);
    }
  }, [draft, id, monthlyPeriod, monthlyPropertyId]);

  return { draft, update, save, isSaving };
}
