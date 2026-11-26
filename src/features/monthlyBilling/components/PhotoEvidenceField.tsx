import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Image, Modal, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import ZoomableImage from "../../../../components/ZoomableImage";
import { useImageSourcePicker } from "../../../hooks/useImageSourcePicker";
import { resolvePhotoUri } from "../../../services/photoStorage";

type PhotoEvidenceFieldProps = {
  label: string;
  uri: string | undefined;
  onChange: (uri: string | undefined) => void;
  cameraPermissionMessage: string;
  libraryPermissionMessage: string;
  addLabel: string;
  editable?: boolean;
};

export function PhotoEvidenceField({
  label,
  uri,
  onChange,
  cameraPermissionMessage,
  libraryPermissionMessage,
  addLabel,
  editable = true,
}: PhotoEvidenceFieldProps) {
  const { pickImages } = useImageSourcePicker();
  const [showPreview, setShowPreview] = useState(false);
  const resolvedUri = uri ? (resolvePhotoUri(uri) ?? uri) : undefined;

  const takePhoto = async () => {
    const [next] = await pickImages("camera", { cameraPermissionMessage });
    if (next) onChange(next);
  };

  const chooseFromLibrary = async () => {
    const [next] = await pickImages("gallery", { libraryPermissionMessage });
    if (next) onChange(next);
  };

  const choose = () =>
    Alert.alert(label, "Choose a photo source", [
      { text: "Cancel", style: "cancel" },
      { text: "Take photo", onPress: () => void takePhoto() },
      { text: "Choose from library", onPress: () => void chooseFromLibrary() },
    ]);

  return (
    <View className="mt-3">
      <Text className="mb-1.5 text-xs font-bold text-slate-700">{label}</Text>
      {uri && resolvedUri ? (
        <>
          <View className="overflow-hidden rounded-2xl border border-slate-200">
            <Pressable
              accessibilityLabel={`View ${label.toLowerCase()}`}
              onPress={() => setShowPreview(true)}
            >
              <Image
                className="h-40 w-full"
                resizeMode="cover"
                source={{ uri: resolvedUri }}
              />
            </Pressable>
            {editable ? (
              <>
                <Pressable
                  accessibilityLabel={`Replace ${label.toLowerCase()}`}
                  className="absolute left-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-black/60"
                  onPress={choose}
                >
                  <MaterialCommunityIcons
                    color="#fff"
                    name="camera-plus-outline"
                    size={18}
                  />
                </Pressable>
                <Pressable
                  accessibilityLabel={`Delete ${label.toLowerCase()}`}
                  className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-black/60"
                  onPress={() => onChange(undefined)}
                >
                  <MaterialCommunityIcons
                    color="#fff"
                    name="trash-can-outline"
                    size={18}
                  />
                </Pressable>
              </>
            ) : null}
            <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between bg-black/45 px-3 py-1.5">
              <Text className="text-[10px] font-semibold text-white">
                Tap the photo to view and zoom
              </Text>
              <MaterialCommunityIcons
                color="#fff"
                name="arrow-expand"
                size={14}
              />
            </View>
          </View>

          <Modal
            animationType="fade"
            onRequestClose={() => setShowPreview(false)}
            transparent
            visible={showPreview}
          >
            <GestureHandlerRootView style={{ flex: 1 }}>
              <View className="flex-1 items-center justify-center bg-black/95">
                <Pressable
                  accessibilityLabel="Close photo"
                  className="absolute right-5 top-12 z-10 h-11 w-11 items-center justify-center rounded-full bg-white/20"
                  onPress={() => setShowPreview(false)}
                >
                  <MaterialCommunityIcons
                    color="#fff"
                    name="close"
                    size={25}
                  />
                </Pressable>
                <ZoomableImage uri={resolvedUri} />
              </View>
            </GestureHandlerRootView>
          </Modal>
        </>
      ) : (
        <Pressable
          accessibilityLabel={addLabel}
          className="h-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50"
          onPress={choose}
        >
          <MaterialCommunityIcons
            color="#64748B"
            name="camera-outline"
            size={26}
          />
          <Text className="mt-1 text-xs font-semibold text-slate-600">
            {addLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
