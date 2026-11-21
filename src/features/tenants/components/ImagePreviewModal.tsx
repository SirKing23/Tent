import Ionicons from "@react-native-vector-icons/ionicons";
import { Image, Modal, Pressable, View } from "react-native";

type ImagePreviewModalProps = {
  image: { uri: string; label: string } | null;
  onClose: () => void;
};

export function ImagePreviewModal({ image, onClose }: ImagePreviewModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={Boolean(image)}
    >
      <View className="flex-1 items-center justify-center bg-[rgba(4,10,24,0.96)] p-[20px]">
        <Pressable
          accessibilityLabel="Close image preview"
          className="absolute right-[20px] top-[52px] z-10 h-[44px] w-[44px] items-center justify-center rounded-[22px] bg-[rgba(255,255,255,0.18)]"
          onPress={onClose}
        >
          <Ionicons color="#fff" name="close" size={25} />
        </Pressable>
        {image ? (
          <Image
            accessibilityLabel={image.label}
            className="h-4/5 w-full"
            resizeMode="contain"
            source={{ uri: image.uri }}
          />
        ) : null}
      </View>
    </Modal>
  );
}
