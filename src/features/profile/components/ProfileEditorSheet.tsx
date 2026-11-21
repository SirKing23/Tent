import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { BottomSheet } from "../../../../components/BottomSheet";
import { getProfileInitials } from "../logic/profile";
import type { UserProfile } from "../types";

function ProfileForm({
  profile,
  onClose,
  onSave,
}: {
  profile: UserProfile;
  onClose: () => void;
  onSave: (profile: UserProfile) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [isSaving, setIsSaving] = useState(false);

  const initials = useMemo(() => getProfileInitials(fullName), [fullName]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert(
        "Name required",
        "Enter your name so the dashboard greeting feels personal.",
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ fullName, email });
      onClose();
    } catch (error) {
      console.error("Unable to save user profile:", error);
      Alert.alert("Save failed", "Your account details could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <View className="mb-5 flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-emerald-600">
            <Text className="text-base font-bold text-white">{initials}</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-bold text-slate-900">
              Account settings
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              Your name appears on the dashboard.
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel="Close account settings"
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 active:opacity-70"
          onPress={onClose}
        >
          <MaterialCommunityIcons name="close" size={18} color="#475569" />
        </Pressable>
      </View>

      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Full name
      </Text>
      <TextInput
        autoCapitalize="words"
        autoCorrect={false}
        className="mb-4 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900"
        onChangeText={setFullName}
        placeholder="e.g. Juan Dela Cruz"
        placeholderTextColor="#94A3B8"
        returnKeyType="next"
        value={fullName}
      />

      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Email (optional)
      </Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        className="mb-5 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor="#94A3B8"
        returnKeyType="done"
        value={email}
      />

      <Pressable
        accessibilityLabel="Save account details"
        accessibilityRole="button"
        className="h-12 flex-row items-center justify-center rounded-xl bg-emerald-600 active:opacity-80"
        disabled={isSaving}
        onPress={() => void handleSave()}
        style={{ opacity: isSaving ? 0.7 : 1 }}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={18}
              color="#FFFFFF"
            />
            <Text className="ml-2 text-base font-semibold text-white">
              Save details
            </Text>
          </>
        )}
      </Pressable>
    </>
  );
}

export function ProfileEditorSheet({
  visible,
  profile,
  onClose,
  onSave,
}: {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (profile: UserProfile) => Promise<void>;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {visible ? (
        <ProfileForm onClose={onClose} onSave={onSave} profile={profile} />
      ) : null}
    </BottomSheet>
  );
}
