import type { ValidationResult } from "../../../types/validation";
import { createSlugId } from "../../../utils/id";
import { parseFloatValue, parseIntegerInRange } from "../../../utils/number";

import type {
  BillingDraft,
  BillingItem,
  BillingType,
} from "../types";
import { buildBillReminder, isValidReminderTime } from "./billReminders";

/** True when a bill can be metered separately inside a unit. */
export const isSubMeterEligible = (billingType: BillingType): boolean =>
  billingType === "Total consumption" || billingType === "Meter reading";

/** True when a bill can be shared with units as a fixed peso amount. */
export const isFixedShareEligible = (billingType: BillingType): boolean =>
  billingType === "Fixed amount per month";

/**
 * A fixed share only makes sense for a unit whose parent building also carries
 * the bill.
 */
export const isFixedShareCandidate = ({
  propertyType,
  billingType,
  isInParentBuilding,
}: {
  propertyType: "Building" | "Unit";
  billingType: BillingType;
  isInParentBuilding: boolean;
}): boolean =>
  propertyType === "Unit" &&
  isInParentBuilding &&
  isFixedShareEligible(billingType);

/**
 * A sub-meter only makes sense for a unit whose parent building also carries
 * the bill, and only for consumption-based billing types.
 */
export const isSubMeterCandidate = ({
  propertyType,
  billingType,
  isInParentBuilding,
}: {
  propertyType: "Building" | "Unit";
  billingType: BillingType;
  isInParentBuilding: boolean;
}): boolean =>
  propertyType === "Unit" &&
  isInParentBuilding &&
  isSubMeterEligible(billingType);

/** Step 1 · Details — name and default amount. */
export const validateBillingDetailsStep = (
  draft: BillingDraft,
): ValidationResult => {
  if (!draft.name.trim()) {
    return {
      valid: false,
      title: "Name required",
      message: "Enter a name for this billing item.",
    };
  }

  if (draft.defaultAmount.trim() && parseFloatValue(draft.defaultAmount) === null) {
    return {
      valid: false,
      title: "Invalid amount",
      message: "Enter a valid default amount.",
    };
  }

  return { valid: true };
};

/** Step 2 · Due date — the scheme's own requirements. */
export const validateBillingDueDateStep = (
  draft: BillingDraft,
): ValidationResult => {
  if (draft.dueDateType === "Fixed date" && !draft.fixedDueDate.trim()) {
    return {
      valid: false,
      title: "Due date required",
      message: "Enter a fixed due date or choose another due-date option.",
    };
  }

  if (
    draft.dueDateType === "Recurring monthly" &&
    draft.recurringRule === "Day of the month" &&
    parseIntegerInRange(draft.recurringDay, 1, 31) === null
  ) {
    return {
      valid: false,
      title: "Invalid recurring day",
      message: "Enter a whole number from 1 to 31.",
    };
  }

  return { valid: true };
};

/** Step 3 · Reminder — at least one dated option with a valid time. */
export const validateBillingReminderStep = (
  draft: BillingDraft,
): ValidationResult => {
  if (!draft.reminderEnabled || draft.dueDateType === "No Due date") {
    return { valid: true };
  }

  const times = Object.values(draft.reminderTimes).filter(
    (time): time is string => typeof time === "string",
  );
  if (times.length === 0) {
    return {
      valid: false,
      title: "Reminder needs a time",
      message:
        "Choose at least one reminder (2 days before, 1 day before, or on the due date) or turn the reminder off.",
    };
  }
  if (!times.every(isValidReminderTime)) {
    return {
      valid: false,
      title: "Invalid reminder time",
      message: "Pick a valid time for every reminder.",
    };
  }

  return { valid: true };
};

/** Whole draft, used when saving. Each step validates its own slice first. */
export const validateBillingDraft = (
  draft: BillingDraft,
): ValidationResult => {
  const steps = [
    validateBillingDetailsStep,
    validateBillingDueDateStep,
    validateBillingReminderStep,
  ];
  for (const validate of steps) {
    const result = validate(draft);
    if (!result.valid) return result;
  }
  return { valid: true };
};

/** Builds the persisted record from validated form input. */
export const buildBillingItem = ({
  draft,
  id,
  createdAt,
}: {
  draft: BillingDraft;
  id?: string;
  createdAt?: string;
}): BillingItem => {
  const name = draft.name.trim();
  const amountInput = draft.defaultAmount.trim();
  const parsedAmount = amountInput
    ? (parseFloatValue(draft.defaultAmount) ?? undefined)
    : undefined;
  const parsedRecurringDay = parseIntegerInRange(draft.recurringDay, 1, 31);

  return {
    id: id ?? createSlugId(name),
    name,
    utilityType: draft.utilityType,
    billingType: draft.billingType,
    displayUnit: draft.displayUnit.trim(),
    defaultAmount: parsedAmount,
    dueDateType: draft.dueDateType,
    fixedDueDate:
      draft.dueDateType === "Fixed date"
        ? draft.fixedDueDate.trim()
        : undefined,
    recurringRule:
      draft.dueDateType === "Recurring monthly"
        ? draft.recurringRule
        : undefined,
    recurringDay:
      draft.dueDateType === "Recurring monthly" &&
      draft.recurringRule === "Day of the month"
        ? (parsedRecurringDay ?? undefined)
        : undefined,
    // Alerts are placed relative to a due date, so a bill without one keeps none.
    reminder:
      draft.dueDateType === "No Due date" || !draft.reminderEnabled
        ? undefined
        : buildBillReminder(draft.reminderTimes),
    createdAt: createdAt ?? new Date().toISOString(),
  };
};

type DueDateSource = Pick<
  BillingItem,
  "dueDateType" | "fixedDueDate" | "recurringRule" | "recurringDay"
>;

/** Human-readable due-date line used by bill and property lists. */
export const getDueDateSummary = (bill: DueDateSource): string => {
  if (bill.dueDateType === "Fixed date") {
    return bill.fixedDueDate ?? bill.dueDateType;
  }
  if (
    bill.dueDateType === "Recurring monthly" &&
    bill.recurringRule === "Day of the month"
  ) {
    return `Day ${bill.recurringDay ?? "—"} of each month`;
  }
  return bill.recurringRule ?? bill.dueDateType;
};

export const getBillingSummary = (bills: readonly BillingItem[]) => ({
  total: bills.length,
  withAmount: bills.filter((bill) => bill.defaultAmount !== undefined).length,
  recurring: bills.filter((bill) => bill.dueDateType === "Recurring monthly")
    .length,
});

export const filterBills = (
  bills: readonly BillingItem[],
  query: string,
): BillingItem[] => {
  const search = query.trim().toLowerCase();
  if (!search) return [...bills];
  return bills.filter((bill) =>
    [bill.name, bill.billingType, bill.displayUnit, bill.dueDateType]
      .join(" ")
      .toLowerCase()
      .includes(search),
  );
};

/**
 * Drops sub-meter selections that are no longer valid for the property being
 * saved: bill must still be linked, the property must be a unit, the parent
 * building must carry the bill, and the bill must be consumption-based.
 */
export const pruneSubMeterBillIds = ({
  subMeterBillIds,
  billIds,
  propertyType,
  parentBillIds,
  bills,
}: {
  subMeterBillIds: readonly string[];
  billIds: readonly string[];
  propertyType: "Building" | "Unit";
  parentBillIds: readonly string[] | undefined;
  bills: readonly Pick<BillingItem, "id" | "billingType">[];
}): string[] => {
  if (propertyType !== "Unit" || !parentBillIds) return [];

  return subMeterBillIds.filter((billId) => {
    const bill = bills.find((item) => item.id === billId);
    return (
      billIds.includes(billId) &&
      parentBillIds.includes(billId) &&
      Boolean(bill && isSubMeterEligible(bill.billingType))
    );
  });
};
