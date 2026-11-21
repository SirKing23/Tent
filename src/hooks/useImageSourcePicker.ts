import * as ImagePicker from "expo-image-picker";
import { useCallback } from "react";
import { Alert } from "react-native";

export type ImageSource = "camera" | "gallery";

type PickImagesOptions = {
  allowsMultipleSelection?: boolean;
  quality?: number;
  permissionTitle?: string;
  cameraPermissionMessage?: string;
  libraryPermissionMessage?: string;
};

/**
 * Requests the right permission, opens the camera or library, and returns the
 * picked URIs (empty when denied or cancelled). Permission copy is passed in so
 * each screen keeps its existing wording.
 */
export function useImageSourcePicker() {
  const pickImages = useCallback(
    async (
      source: ImageSource,
      {
        allowsMultipleSelection = false,
        quality = 0.8,
        permissionTitle = "Permission required",
        cameraPermissionMessage = "Camera access is needed to add a picture.",
        libraryPermissionMessage = "Photo-library access is needed to add a picture.",
      }: PickImagesOptions = {},
    ): Promise<string[]> => {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          permissionTitle,
          source === "camera"
            ? cameraPermissionMessage
            : libraryPermissionMessage,
        );
        return [];
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ allowsEditing: false, quality })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              allowsMultipleSelection,
              mediaTypes: ["images"],
              quality,
              ...(allowsMultipleSelection ? { selectionLimit: 0 } : {}),
            });

      if (result.canceled) return [];
      return result.assets.map((asset) => asset.uri);
    },
    [],
  );

  return { pickImages };
}
