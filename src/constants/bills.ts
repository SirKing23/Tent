export const BILLING_TYPES = [
  "Fixed amount per month",
  "Total consumption",
  "Meter reading",
  "Split across units",
  "Per Person",
] as const;

export const UTILITY_TYPES = [
  "Internet",
  "Water",
  "Electricity",
  "Rent",
  "Other bills",
] as const;

export const DUE_DATE_TYPES = [
  "Fixed date",
  "No Due date",
  "Recurring monthly",
] as const;

export const RECURRING_RULES = [
  "Day of the month",
  "First day of the month",
  "Every last day of the month",
] as const;
