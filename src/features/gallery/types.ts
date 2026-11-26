export type GalleryAssetKind =
  | "property-photo"
  | "tenant-photo"
  | "tenant-id"
  | "cashbook-entry"
  | "bill-reading"
  | "bill-payment";

export type GalleryFact = {
  label: string;
  value: string;
};

/** A screen that owns the record the photo was attached to. */
export type GalleryTarget =
  | { kind: "property"; propertyId: string }
  | { kind: "tenants"; tenantId: string }
  | { kind: "cashbook"; cashbookId: string }
  | {
      kind: "billing";
      /** Building that owns the bill page, when the photo belongs to one. */
      buildingId: string | null;
      /** Standalone unit to highlight on the monthly overview. */
      unitId: string | null;
      period: string;
    };

/** Identifies the exact record field that must be cleared on delete. */
export type GalleryDeleteRef =
  | { kind: "property-photo"; propertyId: string }
  | { kind: "tenant-photo"; tenantId: string }
  | { kind: "tenant-id"; tenantId: string }
  | { kind: "cashbook-entry"; entryId: string }
  | {
      kind: "bill-reading";
      period: string;
      propertyId: string;
      billingItemId: string;
    }
  | {
      kind: "bill-payment";
      period: string;
      propertyId: string;
      billingItemId: string;
    };

export type GalleryAsset = {
  /** Stable identity across reloads, derived from the stored path. */
  key: string;
  kind: GalleryAssetKind;
  /** The value persisted in the database (usually `photos/<file>.jpg`). */
  storedPath: string;
  uri: string;
  /** Milliseconds since epoch; `0` when the save date cannot be determined. */
  savedAt: number;
  /** Short badge such as `Meter reading` or `Payment proof`. */
  tag: string;
  title: string;
  subtitle: string;
  facts: GalleryFact[];
  target: GalleryTarget | null;
  ref: GalleryDeleteRef;
};

export type GallerySection = {
  key: string;
  title: string;
  assets: GalleryAsset[];
};
