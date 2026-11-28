import type { PropertyOccupancy } from "../logic/propertyRules";

/** Cards hint vacancy in green and occupancy in blue. */
export const PROPERTY_OCCUPANCY_STYLES: Record<
  PropertyOccupancy,
  { border: string; pill: string; pillText: string; label: string }
> = {
  vacant: {
    border: "#16A34A",
    pill: "bg-[#E8F7EE]",
    pillText: "text-[#0F8A4F]",
    label: "Vacant",
  },
  occupied: {
    border: "#2563EB",
    pill: "bg-[#E7F0FE]",
    pillText: "text-[#2563EB]",
    label: "Occupied",
  },
};
