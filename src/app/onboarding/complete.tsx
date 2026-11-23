import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../features/auth/hooks/useAuth";
import { getCashbooks } from "../../features/cashbooks/services/cashbookRepository";
import { PrimaryButton } from "../../features/onboarding/components/PrimaryButton";
import { useOnboardingDraft } from "../../features/onboarding/providers/OnboardingProvider";
import { getProfileFirstName } from "../../features/profile/logic/profile";

export default function SetupCompleteScreen() {
  const { enterApp } = useAuth();
  const { draft } = useOnboardingDraft();
  const [hasCashbooks, setHasCashbooks] = useState<boolean | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const cashbooks = await getCashbooks();
      if (active) setHasCashbooks(cashbooks.length > 0);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!draft.pinCredential || !draft.privacyAcceptedAt) {
    return <Redirect href="/onboarding/security" />;
  }

  const firstName = getProfileFirstName(draft.fullName);
  const isCheckingCashbooks = hasCashbooks === null;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-7 h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
          <MaterialCommunityIcons
            name="check-decagram"
            size={56}
            color="#059669"
          />
        </View>

        <Text className="text-center text-[28px] font-extrabold leading-9 text-slate-900">
          You&apos;re all set, {firstName}!
        </Text>
        <Text className="mt-3 max-w-[320px] text-center text-[15px] leading-6 text-slate-500">
          Your local profile and PIN are ready. Tent will ask for your PIN
          whenever the app reopens.
        </Text>

        {isCheckingCashbooks ? (
          <View className="mt-8 flex-row items-center">
            <ActivityIndicator color="#059669" size="small" />
            <Text className="ml-2 text-xs text-slate-500">
              Checking your cashbooks…
            </Text>
          </View>
        ) : hasCashbooks ? null : (
          <View className="mt-8 w-full items-center rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/60 px-5 py-5">
            <MaterialCommunityIcons
              name="book-plus-outline"
              size={26}
              color="#059669"
            />
            <Text className="mt-2 text-sm font-bold text-emerald-900">
              No cashbooks yet
            </Text>
            <Text className="mt-1 text-center text-[12px] leading-5 text-emerald-800/80">
              Create your first cashbook to start tracking money in and out.
            </Text>
          </View>
        )}
      </View>

      <View className="px-6 pb-4">
        <PrimaryButton
          disabled={isFinishing}
          icon="view-dashboard-outline"
          label="Go to Dashboard"
          onPress={() => {
            setIsFinishing(true);
            enterApp();
          }}
        />
        {hasCashbooks === false ? (
          <View className="mt-3">
            <PrimaryButton
              disabled={isFinishing}
              icon="book-plus-outline"
              label="Create Your First Cashbook"
              onPress={() => {
                setIsFinishing(true);
                enterApp("/cashbook-AddNewBook");
              }}
              variant="secondary"
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
