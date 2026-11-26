import type { GalleryAsset } from "../../types";
import {
  formatGalleryDateTime,
  formatGalleryDayLabel,
  getGalleryTileSize,
  groupGalleryAssets,
  parsePhotoSavedAt,
  resolveSavedAt,
} from "../gallery";

const makeAsset = (overrides: Partial<GalleryAsset> = {}): GalleryAsset => ({
  key: "asset",
  kind: "property-photo",
  storedPath: "photos/property-photo-1732435200000-ab12cd.jpg",
  uri: "file:///photos/property-photo-1732435200000-ab12cd.jpg",
  savedAt: 0,
  tag: "Property photo",
  title: "Sunrise Apartments",
  subtitle: "",
  facts: [],
  target: null,
  ref: { kind: "property-photo", propertyId: "property-1" },
  ...overrides,
});

describe("photo save timestamps", () => {
  it("reads the timestamp persistPhoto embeds in the file name", () => {
    expect(
      parsePhotoSavedAt("photos/property-photo-1732435200000-ab12cd.jpg"),
    ).toBe(1732435200000);
    expect(
      parsePhotoSavedAt(
        "file:///data/photos/entry-photo-1732435200000-ab12cd.jpeg?cache=1",
      ),
    ).toBe(1732435200000);
  });

  it("ignores names without a millisecond timestamp", () => {
    expect(parsePhotoSavedAt("photos/photo.jpg")).toBeNull();
    expect(parsePhotoSavedAt("photos/tenant-photo-abc-def.jpg")).toBeNull();
    expect(parsePhotoSavedAt("photos/photo-1732435200-ab.jpg")).toBeNull();
  });

  it("prefers the file name, then the file timestamp, then the record date", () => {
    const stored = "photos/meter-photo-1732435200000-ab12cd.jpg";

    expect(
      resolveSavedAt(stored, { fileTimestamp: 1, fallback: "2020-01-01" }),
    ).toBe(1732435200000);
    expect(
      resolveSavedAt("photos/legacy.jpg", {
        fileTimestamp: 1732435200000,
        fallback: "2020-01-01",
      }),
    ).toBe(1732435200000);
    expect(
      resolveSavedAt("photos/legacy.jpg", {
        fileTimestamp: null,
        fallback: "2020-01-01T00:00:00.000Z",
      }),
    ).toBe(Date.parse("2020-01-01T00:00:00.000Z"));
    expect(resolveSavedAt("photos/legacy.jpg")).toBe(0);
  });
});

describe("gallery date labels", () => {
  const now = new Date(2026, 10, 23, 12, 0, 0);

  it("labels today and yesterday", () => {
    expect(formatGalleryDayLabel(new Date(2026, 10, 23, 9, 0).getTime(), now)).toBe(
      "Today",
    );
    expect(formatGalleryDayLabel(new Date(2026, 10, 22, 9, 0).getTime(), now)).toBe(
      "Yesterday",
    );
  });

  it("labels older days, adding the year only when it differs", () => {
    expect(formatGalleryDayLabel(new Date(2026, 10, 20).getTime(), now)).toBe(
      "Friday, November 20",
    );
    expect(
      formatGalleryDayLabel(
        new Date(2026, 10, 20).getTime(),
        new Date(2027, 0, 10),
      ),
    ).toBe("Friday, November 20, 2026");
  });

  it("formats the saved time", () => {
    expect(formatGalleryDateTime(new Date(2026, 10, 23, 9, 42).getTime())).toBe(
      "Nov 23, 2026 · 9:42 AM",
    );
    expect(formatGalleryDateTime(0)).toBe("Unknown");
  });
});

describe("gallery sections", () => {
  const now = new Date(2026, 10, 23, 12, 0, 0);

  it("groups by saved day, newest first, with undated photos last", () => {
    const todayMorning = makeAsset({
      key: "today-morning",
      savedAt: new Date(2026, 10, 23, 9).getTime(),
    });
    const todayDawn = makeAsset({
      key: "today-dawn",
      savedAt: new Date(2026, 10, 23, 6).getTime(),
    });
    const yesterday = makeAsset({
      key: "yesterday",
      savedAt: new Date(2026, 10, 22, 18).getTime(),
    });
    const undated = makeAsset({ key: "undated", savedAt: 0 });

    const sections = groupGalleryAssets(
      [yesterday, undated, todayDawn, todayMorning],
      now,
    );

    expect(sections.map((section) => section.title)).toEqual([
      "Today",
      "Yesterday",
      "Earlier",
    ]);
    expect(sections[0].assets.map((asset) => asset.key)).toEqual([
      "today-morning",
      "today-dawn",
    ]);
    expect(sections[2].assets.map((asset) => asset.key)).toEqual(["undated"]);
  });
});

describe("gallery tile sizing", () => {
  it("fits three square tiles plus gaps inside the padded width", () => {
    // 390pt phone: (390 - 32 - 16) / 3 = 114
    expect(getGalleryTileSize(390)).toBe(114);
    expect(getGalleryTileSize(390, { columns: 3 })).toBe(114);
  });

  it("never returns a zero or negative size on very narrow screens", () => {
    expect(getGalleryTileSize(100)).toBe(72);
    expect(getGalleryTileSize(0)).toBe(72);
  });

  it("honours custom columns, gaps, and padding", () => {
    expect(getGalleryTileSize(400, { columns: 2, gap: 10, padding: 20 })).toBe(
      175,
    );
  });
});
