import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type { UtilityType } from "../types";

export type MaterialIconName = ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

export type UtilityIconStyle = {
  backgroundColor: string;
  iconColor: string;
};

export const getUtilityIcon = (
  utilityType: UtilityType,
): MaterialIconName => {
  switch (utilityType) {
    case "Internet":
      return "wifi";
    case "Water":
      return "water-outline";
    case "Electricity":
      return "flash-outline";
    case "Rent":
      return "home-city-outline";
    case "Other bills":
    default:
      return "file-document-outline";
  }
};

export const getUtilityIconStyle = (
  utilityType: UtilityType,
): UtilityIconStyle => {
  switch (utilityType) {
    case "Internet":
      return { backgroundColor: "#EEF2FF", iconColor: "#4F46E5" };
    case "Water":
      return { backgroundColor: "#E0F7FA", iconColor: "#0891B2" };
    case "Electricity":
      return { backgroundColor: "#FEF3C7", iconColor: "#D97706" };
    case "Rent":
      return { backgroundColor: "#FFEDD5", iconColor: "#C2410C" };
    case "Other bills":
    default:
      return { backgroundColor: "#F1F5F9", iconColor: "#475569" };
  }
};
