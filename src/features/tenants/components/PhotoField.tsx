import Ionicons from "@react-native-vector-icons/ionicons";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { resolvePhotoUri } from "../../../services/photoStorage";

type PhotoFieldProps = {
  label: string;
  photo: string | null;
  onImage: (source: "gallery" | "camera") => void;
  onRemove: () => void;
  isProfile?: boolean;
};

export function PhotoField({
  label,
  photo,
  onImage,
  onRemove,
  isProfile = false,
}: PhotoFieldProps) {
  const choose = () =>
    Alert.alert("Add photo", "Choose a photo source", [
      { text: "Cancel", style: "cancel" },
      { text: "Take photo", onPress: () => void onImage("camera") },
      { text: "Choose from library", onPress: () => void onImage("gallery") },
    ]);

  if (isProfile) {
    return (
      <View style={styles.profileField}>
        <Text style={[styles.label, styles.profileLabel]}>{label}</Text>
        <View style={styles.profileWrap}>
          {photo ? (
            <Image
              source={{ uri: resolvePhotoUri(photo) ?? photo }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Ionicons color="#70839d" name="person" size={46} />
            </View>
          )}
          <Pressable
            accessibilityLabel={
              photo ? "Edit profile picture" : "Add profile picture"
            }
            onPress={choose}
            style={styles.profileAction}
          >
            <Ionicons
              color="#fff"
              name={photo ? "pencil" : "camera-outline"}
              size={16}
            />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.photoField}>
      <View style={styles.photoHeader}>
        <Text style={styles.label}>{photo ? "Delete photo" : label}</Text>
        <Pressable onPress={photo ? onRemove : choose} style={styles.photoAction}>
          <Ionicons
            color={photo ? "#cc4040" : "#22324a"}
            name={photo ? "trash-outline" : "camera-outline"}
            size={19}
          />
        </Pressable>
      </View>
      {photo ? (
        <Image
          source={{ uri: resolvePhotoUri(photo) ?? photo }}
          style={styles.preview}
        />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons color="#70839d" name="image-outline" size={24} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: "#29466c", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  profileField: { alignItems: "center", marginBottom: 20 },
  profileLabel: { alignSelf: "stretch", marginBottom: 10 },
  profileWrap: { height: 112, position: "relative", width: 112 },
  profileImage: { borderRadius: 56, height: 112, width: 112 },
  profilePlaceholder: {
    alignItems: "center",
    backgroundColor: "#e9eef5",
    borderColor: "#d5dfeb",
    borderRadius: 56,
    borderWidth: 1,
    height: 112,
    justifyContent: "center",
    width: 112,
  },
  profileAction: {
    alignItems: "center",
    backgroundColor: "#5041df",
    borderColor: "#f7f9fc",
    borderRadius: 17,
    borderWidth: 3,
    bottom: -2,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 2,
    width: 34,
  },
  photoField: { marginBottom: 16 },
  photoHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  photoAction: {
    alignItems: "center",
    borderColor: "#dfe7f0",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  photoPlaceholder: {
    alignItems: "center",
    backgroundColor: "#e9eef5",
    borderColor: "#d5dfeb",
    borderRadius: 15,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  preview: { borderRadius: 15, height: 160, width: 160 },
});
