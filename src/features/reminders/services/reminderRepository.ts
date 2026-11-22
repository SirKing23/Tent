import { getDatabase } from "../../../services/database";
import type { Reminder, ReminderRepeat } from "../types";

type ReminderRow = {
  id: string;
  title: string;
  notes: string;
  remind_at: string;
  repeat_rule: ReminderRepeat;
  created_at: string;
};

const mapReminderRow = (row: ReminderRow): Reminder => ({
  id: row.id,
  title: row.title,
  notes: row.notes,
  remindAt: row.remind_at,
  repeat: row.repeat_rule,
  createdAt: row.created_at,
});

export async function getReminders(): Promise<Reminder[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ReminderRow>(
      "SELECT * FROM reminders ORDER BY remind_at ASC",
    );
    return rows.map(mapReminderRow);
  } catch (error) {
    console.error("Unable to load reminders:", error);
    return [];
  }
}

export async function saveReminderRecord(reminder: Reminder): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO reminders (
      id, title, notes, remind_at, repeat_rule, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      notes = excluded.notes,
      remind_at = excluded.remind_at,
      repeat_rule = excluded.repeat_rule`,
    reminder.id,
    reminder.title,
    reminder.notes,
    reminder.remindAt,
    reminder.repeat,
    reminder.createdAt,
  );
}

export async function deleteReminderRecord(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM reminders WHERE id = ?", id);
}
