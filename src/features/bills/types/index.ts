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

/** Days before the due date a bill can remind: 2, 1, or on the day itself. */
export type BillReminderOffset = 0 | 1 | 2;

export type BillReminderSlot = {
  offset: BillReminderOffset;
  /** Local time of day as `HH:mm`. */
  time: string;
};

/** Reminder settings stored with the bill; empty/absent means no alerts. */
export type BillReminderSettings = { slots: BillReminderSlot[] };

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
  /** Alerts placed relative to each month's due date. */
  reminder?: BillReminderSettings;
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
  reminderEnabled: boolean;
  /** Selected offsets with their time of day (`HH:mm`). */
  reminderTimes: Partial<Record<BillReminderOffset, string>>;
};
