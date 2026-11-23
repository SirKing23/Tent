import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { BottomSheet } from "../../../../components/BottomSheet";
import { useAuth } from "../../auth/hooks/useAuth";
import { getBiometricCapability } from "../../auth/services/biometricService";
import type { BiometricCapability } from "../../auth/types";
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
} from "../../../utils/currency";
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
  const [currencyCode, setCurrencyCode] = useState(profile.currencyCode);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initials = useMemo(() => getProfileInitials(fullName), [fullName]);

  const handleSave = async () => {
    if (isDeleting) return;

    if (!fullName.trim()) {
      Alert.alert(
        "Name required",
        "Enter your name so the dashboard greeting feels personal.",
      );
      return;
    }

    const currency =
      SUPPORTED_CURRENCIES.find((item) => item.code === currencyCode) ??
      DEFAULT_CURRENCY;

    setIsSaving(true);
    try {
      await onSave({
        fullName,
        email,
        currencyCode: currency.code,
        currencySymbol: currency.symbol,
      });
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

      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Default currency
      </Text>

      <View className="mb-5 flex-row flex-wrap" style={{ gap: 8 }}>
        {SUPPORTED_CURRENCIES.map((currency) => {
          const isSelected = currency.code === currencyCode;
          return (
            <Pressable
              key={currency.code}
              accessibilityLabel={`Use ${currency.name}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              className={`rounded-xl border px-3 py-2 active:opacity-70 ${
                isSelected
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
              onPress={() => setCurrencyCode(currency.code)}
            >
              <Text
                className={`text-xs font-semibold ${
                  isSelected ? "text-emerald-800" : "text-slate-600"
                }`}
              >
                {currency.code} {currency.symbol}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SecuritySettings />

      <Pressable
        accessibilityLabel="Save account details"
        accessibilityRole="button"
        className="h-12 flex-row items-center justify-center rounded-xl bg-emerald-600 active:opacity-80"
        disabled={isSaving || isDeleting}
        onPress={() => void handleSave()}
        style={{ opacity: isSaving || isDeleting ? 0.7 : 1 }}
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

      <DeleteAccountSection
        isDeleting={isDeleting}
        onClose={onClose}
        onDeletingChange={setIsDeleting}
      />
    </>
  );
}

function DeleteAccountSection({
  isDeleting,
  onClose,
  onDeletingChange,
}: {
  isDeleting: boolean;
  onClose: () => void;
  onDeletingChange: (deleting: boolean) => void;
}) {
  const { deleteAccount } = useAuth();

  const runDelete = async () => {
    onDeletingChange(true);
    try {
      await deleteAccount();
      onClose();
    } catch (error) {
      console.error("Unable to delete the account:", error);
      Alert.alert(
        "Delete failed",
        "Your data could not be deleted. Please close the app and try again.",
      );
    } finally {
      onDeletingChange(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete my account?",
      "This permanently removes your profile, PIN, cashbooks, bills, properties, tenants, reminders, and the photos Tent stored on this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: () => void runDelete(),
        },
      ],
    );
  };

  return (
    <View className="mt-6 border-t border-slate-100 pt-4">
      {isDeleting ? (
        <View className="flex-row items-center justify-center py-3">
          <ActivityIndicator color="#DC2626" size="small" />
          <Text className="ml-2 text-sm font-semibold text-red-600">
            Deleting your data…
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityLabel="Delete my account"
          accessibilityRole="button"
          className="flex-row items-center justify-center rounded-xl py-3 active:opacity-60"
          onPress={confirmDelete}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={18}
            color="#DC2626"
          />
          <Text className="ml-2 text-sm font-semibold text-red-600">
            Delete my account
          </Text>
        </Pressable>
      )}
      <Text className="mt-1 text-center text-[10px] leading-4 text-slate-400">
        Permanently removes all Tent data on this device. Images you saved to
        your gallery are not deleted.
      </Text>
    </View>
  );
}

function SecuritySettings() {
  const {
    appLockEnabled,
    biometricEnabled,
    setAppLockEnabled,
    setBiometricEnabled,
  } = useAuth();
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [isSavingLock, setIsSavingLock] = useState(false);
  const [isSavingBiometrics, setIsSavingBiometrics] = useState(false);

  useEffect(() => {
    let active = true;
    void getBiometricCapability().then((result) => {
      if (active) setCapability(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleAppLockChange = async (next: boolean) => {
    setIsSavingLock(true);
    try {
      await setAppLockEnabled(next);
    } catch (error) {
      console.error("Unable to update app lock:", error);
      Alert.alert("Could not update app lock", "Please try again.");
    } finally {
      setIsSavingLock(false);
    }
  };

  const handleBiometricsChange = async (next: boolean) => {
    setIsSavingBiometrics(true);
    try {
      const result = await setBiometricEnabled(next);
      if (!result.ok && result.reason !== "cancelled") {
        Alert.alert(
          "Biometrics unavailable",
          "Biometric verification did not succeed. You can keep using your PIN.",
        );
      }
    } catch (error) {
      console.error("Unable to update biometric unlock:", error);
      Alert.alert("Could not update biometric unlock", "Please try again.");
    } finally {
      setIsSavingBiometrics(false);
    }
  };

  const biometricsAvailable = Boolean(
    capability?.available && capability.enrolled,
  );

  return (
    <View className="mb-5">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Security
      </Text>

      <View className="rounded-2xl border border-slate-200 bg-white">
        <View className="flex-row items-center px-4 py-3.5">
          <MaterialCommunityIcons
            name="shield-lock-outline"
            size={20}
            color="#059669"
          />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-slate-900">
              Require PIN on launch
            </Text>
            <Text className="mt-0.5 text-[11px] leading-4 text-slate-500">
              Lock Tent when it leaves the foreground.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Require PIN on launch"
            disabled={isSavingLock}
            onValueChange={(next) => void handleAppLockChange(next)}
            thumbColor="#FFFFFF"
            trackColor={{ false: "#CBD5E1", true: "#059669" }}
            value={appLockEnabled}
          />
        </View>

        <View className="h-px bg-slate-100" />

        <View className="flex-row items-center px-4 py-3.5">
          <MaterialCommunityIcons
            name="fingerprint"
            size={20}
            color={biometricsAvailable ? "#059669" : "#94A3B8"}
          />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-slate-900">
              {capability?.label ?? "Biometric unlock"}
            </Text>
            <Text className="mt-0.5 text-[11px] leading-4 text-slate-500">
              {biometricsAvailable
                ? "Unlock without typing your PIN. Your PIN still works."
                : capability?.unavailableReason ??
                  "Checking this device's biometric support…"}
            </Text>
          </View>
          {capability === null ? (
            <ActivityIndicator color="#94A3B8" size="small" />
          ) : (
            <Switch
              accessibilityLabel="Unlock with biometrics"
              disabled={!biometricsAvailable || isSavingBiometrics}
              onValueChange={(next) => void handleBiometricsChange(next)}
              thumbColor="#FFFFFF"
              trackColor={{ false: "#CBD5E1", true: "#059669" }}
              value={biometricEnabled && biometricsAvailable}
            />
          )}
        </View>
      </View>

      <Text className="mt-2 text-[10px] leading-4 text-slate-400">
        The PIN hash is stored in SQLite. Data is not encrypted by the biometric
        prompt; biometrics only unlock the app.
      </Text>
    </View>
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
