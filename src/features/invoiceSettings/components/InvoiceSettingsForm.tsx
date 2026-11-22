import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useImageSourcePicker } from "../../../hooks/useImageSourcePicker";
import { resolvePhotoUri } from "../../../services/photoStorage";
import { DEFAULT_INVOICE_SETTINGS, type InvoiceSettings } from "../types";

type ImageTarget = "icon" | "footer";

export function InvoiceSettingsForm({
  settings,
  onSave,
}: {
  settings: InvoiceSettings;
  onSave: (next: InvoiceSettings) => Promise<void>;
}) {
  const { pickImages } = useImageSourcePicker();
  const [title, setTitle] = useState(settings.title);
  const [subtitle, setSubtitle] = useState(settings.subtitle);
  const [iconUri, setIconUri] = useState<string | null>(settings.iconUri);
  const [paymentNote, setPaymentNote] = useState(settings.paymentNote);
  const [footerImageUri, setFooterImageUri] = useState<string | null>(
    settings.footerImageUri,
  );
  const [isSaving, setIsSaving] = useState(false);

  const iconSource = resolvePhotoUri(iconUri);
  const footerSource = resolvePhotoUri(footerImageUri);

  const pickImage = async (
    target: ImageTarget,
    source: "camera" | "gallery",
  ) => {
    const [uri] = await pickImages(source, {
      allowsMultipleSelection: false,
      cameraPermissionMessage:
        "Camera access is needed to add this invoice image.",
      libraryPermissionMessage:
        "Photo library access is needed to choose this invoice image.",
      quality: 1,
    });
    if (!uri) return;
    if (target === "icon") setIconUri(uri);
    else setFooterImageUri(uri);
  };

  const chooseImage = (target: ImageTarget) =>
    Alert.alert(
      target === "icon" ? "Invoice icon" : "Footer image",
      "Choose a photo source",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Take photo",
          onPress: () => void pickImage(target, "camera"),
        },
        {
          text: "Choose from library",
          onPress: () => void pickImage(target, "gallery"),
        },
      ],
    );

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(
        "Title required",
        "Enter a name to show at the top of the invoice.",
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        subtitle: subtitle.trim(),
        iconUri,
        paymentNote,
        footerImageUri,
      });
    } catch (error) {
      console.error("Unable to save invoice settings:", error);
      Alert.alert(
        "Save failed",
        "The invoice settings could not be saved. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-4 px-1 text-[11px] leading-4 text-[#7c8ba1]">
        Customize the invoice shared from Monthly Billing. Changes apply to
        every property invoice.
      </Text>

      <View className="mb-4 rounded-[24px] border border-[#e4eaf2] bg-white p-4">
        <Text className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-[#8091b1]">
          Header preview
        </Text>
        <View className="mt-3 flex-row items-center">
          <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-[16px] bg-[#4C45F5]">
            {iconSource ? (
              <Image
                className="h-14 w-14"
                resizeMode="cover"
                source={{ uri: iconSource }}
              />
            ) : (
              <MaterialCommunityIcons
                color="#fff"
                name="office-building"
                size={27}
              />
            )}
          </View>
          <View className="ml-3 min-w-0 flex-1">
            <Text
              className="text-[18px] font-extrabold text-[#0d162a]"
              numberOfLines={1}
            >
              {title.trim() || DEFAULT_INVOICE_SETTINGS.title}
            </Text>
            {subtitle.trim() ? (
              <Text
                className="mt-0.5 text-[11px] text-[#7c8ba1]"
                numberOfLines={1}
              >
                {subtitle.trim()}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View className="mb-4 rounded-[24px] border border-[#e4eaf2] bg-white p-4">
        <Text className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-[#8091b1]">
          Brand
        </Text>

        <Text className="mb-1.5 mt-4 text-[12px] font-bold text-[#29466c]">
          Invoice icon
        </Text>
        <View className="flex-row items-center">
          <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] border border-[#e4eaf2] bg-[#4C45F5]">
            {iconSource ? (
              <Image
                className="h-16 w-16"
                resizeMode="cover"
                source={{ uri: iconSource }}
              />
            ) : (
              <MaterialCommunityIcons
                color="#fff"
                name="office-building"
                size={30}
              />
            )}
          </View>
          <View className="ml-3 flex-1">
            <Pressable
              accessibilityLabel="Upload invoice icon"
              className="h-10 flex-row items-center justify-center rounded-xl bg-[#EBECFF] px-3 active:opacity-70"
              onPress={() => chooseImage("icon")}
            >
              <MaterialCommunityIcons
                color="#4C45F5"
                name="image-plus"
                size={17}
              />
              <Text className="ml-1.5 text-[12px] font-extrabold text-[#4C45F5]">
                Upload icon
              </Text>
            </Pressable>
            {iconUri ? (
              <Pressable
                accessibilityLabel="Use default invoice icon"
                className="mt-1.5 h-9 items-center justify-center rounded-xl bg-[#f8fafc] active:opacity-70"
                onPress={() => setIconUri(null)}
              >
                <Text className="text-[11px] font-bold text-[#637b99]">
                  Use default icon
                </Text>
              </Pressable>
            ) : (
              <Text className="mt-1.5 text-center text-[10px] text-[#8b9bb0]">
                Default building icon
              </Text>
            )}
          </View>
        </View>

        <Text className="mb-1.5 mt-5 text-[12px] font-bold text-[#29466c]">
          Invoice title
        </Text>
        <TextInput
          accessibilityLabel="Invoice title"
          autoCapitalize="words"
          autoCorrect={false}
          className="h-12 rounded-xl border border-[#e4eaf2] bg-[#f8fafc] px-3 text-[14px] text-[#0d162a]"
          maxLength={40}
          onChangeText={setTitle}
          placeholder="TENT"
          placeholderTextColor="#94A3B8"
          returnKeyType="next"
          value={title}
        />

        <Text className="mb-1.5 mt-4 text-[12px] font-bold text-[#29466c]">
          Subtitle
        </Text>
        <TextInput
          accessibilityLabel="Invoice subtitle"
          autoCapitalize="sentences"
          autoCorrect={false}
          className="h-12 rounded-xl border border-[#e4eaf2] bg-[#f8fafc] px-3 text-[14px] text-[#0d162a]"
          maxLength={60}
          onChangeText={setSubtitle}
          placeholder="e.g. Property billing"
          placeholderTextColor="#94A3B8"
          returnKeyType="done"
          value={subtitle}
        />
      </View>

      <View className="mb-4 rounded-[24px] border border-[#e4eaf2] bg-white p-4">
        <Text className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-[#8091b1]">
          Payment note
        </Text>
        <Text className="mb-2 mt-2 text-[11px] leading-4 text-[#7c8ba1]">
          Shown above the footer on every invoice. Leave blank to hide it.
        </Text>
        <TextInput
          accessibilityLabel="Invoice payment note"
          className="rounded-xl border border-[#e4eaf2] bg-[#f8fafc] px-3 py-3 text-[13px] leading-5 text-[#0d162a]"
          maxLength={400}
          multiline
          onChangeText={setPaymentNote}
          placeholder="Add payment instructions for tenants"
          placeholderTextColor="#94A3B8"
          style={{ minHeight: 112, textAlignVertical: "top" }}
          value={paymentNote}
        />
      </View>

      <View className="mb-4 rounded-[24px] border border-[#e4eaf2] bg-white p-4">
        <Text className="text-[10px] font-extrabold uppercase tracking-[1.4px] text-[#8091b1]">
          Footer image
        </Text>
        <Text className="mb-3 mt-2 text-[11px] leading-4 text-[#7c8ba1]">
          Add a GCash QR code or payment instructions image. It appears at the
          bottom of every invoice.
        </Text>

        <View className="items-center justify-center rounded-2xl border border-dashed border-[#cdd8e6] bg-[#f8fafc] p-4">
          {footerSource ? (
            <Image
              className="h-[150px] w-[150px]"
              resizeMode="contain"
              source={{ uri: footerSource }}
            />
          ) : (
            <View className="items-center py-6">
              <MaterialCommunityIcons
                color="#94A3B8"
                name="qrcode-scan"
                size={32}
              />
              <Text className="mt-2 text-[11px] text-[#8b9bb0]">
                No footer image
              </Text>
            </View>
          )}
        </View>

        <View className="mt-3 flex-row gap-2">
          <Pressable
            accessibilityLabel="Upload footer image"
            className="h-10 flex-1 flex-row items-center justify-center rounded-xl bg-[#EBECFF] active:opacity-70"
            onPress={() => chooseImage("footer")}
          >
            <MaterialCommunityIcons
              color="#4C45F5"
              name="image-plus"
              size={17}
            />
            <Text className="ml-1.5 text-[12px] font-extrabold text-[#4C45F5]">
              {footerImageUri ? "Replace image" : "Upload image"}
            </Text>
          </Pressable>
          {footerImageUri ? (
            <Pressable
              accessibilityLabel="Remove footer image"
              className="h-10 flex-1 items-center justify-center rounded-xl bg-[#FEF2F2] active:opacity-70"
              onPress={() => setFooterImageUri(null)}
            >
              <Text className="text-[12px] font-extrabold text-[#DC2626]">
                Remove
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityLabel="Save invoice settings"
        className="h-[52px] flex-row items-center justify-center rounded-2xl bg-[#4C45F5] active:opacity-80"
        disabled={isSaving}
        onPress={() => void handleSave()}
        style={{ opacity: isSaving ? 0.7 : 1 }}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons
              color="#fff"
              name="content-save-outline"
              size={19}
            />
            <Text className="ml-2 text-[14px] font-extrabold text-white">
              Save changes
            </Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}
