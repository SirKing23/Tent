import type { GalleryAsset, GallerySection } from "../types";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Full month names for date headings. */
const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * `persistPhoto()` names every saved image `<prefix>-<Date.now()>-<random>.<ext>`,
 * so the save time can be recovered even though it is not stored in a column.
 */
const FILE_TIMESTAMP = /-(\d{13})-[a-z0-9]+(?:\.[a-z0-9]+)?$/i;

const dayNumber = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const isValidTimestamp = (value: number): boolean =>
  Number.isFinite(value) && value > 0;

/** Reads the epoch-millisecond save time embedded in a stored photo path. */
export function parsePhotoSavedAt(storedPath: string): number | null {
  const withoutQuery = storedPath.split("?")[0].split("#")[0];
  const fileName = withoutQuery.slice(withoutQuery.lastIndexOf("/") + 1);
  const match = FILE_TIMESTAMP.exec(fileName);
  if (!match) return null;

  const timestamp = Number(match[1]);
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2001) return null;
  return timestamp;
}

/**
 * Picks the best available save time for a photo: the timestamp in its file
 * name, then the file-system timestamp, then the owning record's date.
 */
export function resolveSavedAt(
  storedPath: string,
  options: { fileTimestamp?: number | null; fallback?: string | null } = {},
): number {
  const fromName = parsePhotoSavedAt(storedPath);
  if (fromName !== null) return fromName;

  if (isValidTimestamp(options.fileTimestamp ?? 0)) {
    return options.fileTimestamp as number;
  }  const fromRecord = options.fallback ? Date.parse(options.fallback) : NaN;
  return Number.isNaN(fromRecord) ? 0 : fromRecord;
}

/** `1732435200000` → `Nov 23, 2026 · 9:42 AM` */
export function formatGalleryDateTime(timestamp: number): string {
  if (!isValidTimestamp(timestamp)) return "Unknown";
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} · ${hour12}:${minutes} ${meridiem}`;
}

/** Section heading for one day: `Today`, `Yesterday`, or `Monday, November 23`. */
export function formatGalleryDayLabel(
  timestamp: number,
  now = new Date(),
): string {
  const date = new Date(timestamp);
  const today = dayNumber(now);
  const day = dayNumber(date);

  if (day === today) return "Today";
  const yesterday = dayNumber(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
  );
  if (day === yesterday) return "Yesterday";

  const label = `${WEEKDAYS[date.getDay()]}, ${FULL_MONTHS[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === now.getFullYear()
    ? label
    : `${label}, ${date.getFullYear()}`;
}

/** Groups assets by the day they were saved, newest day first. */
export function groupGalleryAssets(
  assets: readonly GalleryAsset[],
  now = new Date(),
): GallerySection[] {
  const sorted = [...assets].sort((a, b) => b.savedAt - a.savedAt);
  const sections: GallerySection[] = [];
  const byDay = new Map<string, GallerySection>();
  const undated: GalleryAsset[] = [];

  for (const asset of sorted) {
    if (!isValidTimestamp(asset.savedAt)) {
      undated.push(asset);
      continue;
    }

    const date = new Date(asset.savedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;

    let section = byDay.get(key);
    if (!section) {
      section = {
        key,
        title: formatGalleryDayLabel(asset.savedAt, now),
        assets: [],
      };
      byDay.set(key, section);
      sections.push(section);
    }
    section.assets.push(asset);
  }

  if (undated.length) {
    sections.push({ key: "undated", title: "Earlier", assets: undated });
  }

  return sections;
}

/**
 * Square tile size for a fixed-column grid. Explicit numbers are used because
 * `aspectRatio` + percentage widths inside a row collapse to zero height on
 * native, which makes every photo invisible.
 */
export function getGalleryTileSize(
  windowWidth: number,
  {
    columns = 3,
    gap = 8,
    padding = 16,
    minSize = 72,
  }: { columns?: number; gap?: number; padding?: number; minSize?: number } = {},
): number {
  const usable = windowWidth - padding * 2 - gap * (columns - 1);
  return Math.max(minSize, Math.floor(usable / columns));
}
