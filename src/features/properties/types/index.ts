export type PropertyType = "Building" | "Unit";

export type Property = {
  id: string;
  name: string;
  type: PropertyType;
  parentBuildingId: string | null;
  // Address fields
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  country: string;
  // Photos (stored as JSON array of app-private paths)
  photos: string[];
  // Relations (stored as JSON arrays of IDs)
  billIds: string[];
  subMeterBillIds: string[];
  /** Fixed bills this unit pays a share of (billId → monthly share in pesos). */
  fixedBillShares: Record<string, number>;
  tenantIds: string[];
  createdAt: string;
};

/** Editable property fields captured by the multi-step form. */
export type PropertyDraft = Omit<Property, "id" | "photos" | "createdAt"> & {
  photos: string[];
};
