export type ReminderRepeat = "none" | "daily" | "weekly" | "monthly";

export type Reminder = {
  id: string;
  title: string;
  notes: string;
  /** ISO timestamp of the first (or only) occurrence. */
  remindAt: string;
  repeat: ReminderRepeat;
  createdAt: string;
};

/** Editable reminder fields as held by the editor sheet. */
export type ReminderDraft = {
  title: string;
  notes: string;
  date: Date;
  repeat: ReminderRepeat;
};
