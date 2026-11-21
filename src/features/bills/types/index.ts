import {
  BILLING_TYPES,
  DUE_DATE_TYPES,
  RECURRING_RULES,
  UTILITY_TYPES,
} from "../../../constants/bills";

export type BillingType = (typeof BILLING_TYPES)[number];
export type UtilityType = (typeof UTILITY_TYPES)[number];
export type DueDateType = (typeof DUE_DATE_TYPES)[number];
export type RecurringRule = (typeof RECURRING_RULES)[number];

export type BillingItem = {
  id: string;
  name: string;
  utilityType: UtilityType;
  billingType: BillingType;
  displayUnit: string;
  defaultAmount?: number;
  dueDateType: DueDateType;
  fixedDueDate?: string;
  recurringRule?: RecurringRule;
  recurringDay?: number;
  createdAt: string;
};

/** Editable billing-item fields as typed into the form. */
export type BillingDraft = {
  name: string;
  utilityType: UtilityType;
  billingType: BillingType;
  displayUnit: string;
  defaultAmount: string;
  dueDateType: DueDateType;
  fixedDueDate: string;
  recurringRule: RecurringRule;
  recurringDay: string;
};
