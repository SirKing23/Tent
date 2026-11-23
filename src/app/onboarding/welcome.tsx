import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLogo } from "../../../components/AppLogo";
import { PrimaryButton } from "../../features/onboarding/components/PrimaryButton";
import { StepProgress } from "../../features/onboarding/components/StepProgress";
import { ONBOARDING_STEP_COUNT } from "../../features/onboarding/types";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="flex-1 px-6 pb-3">
        <View className="mt-2 items-end">
          <StepProgress step={1} total={ONBOARDING_STEP_COUNT} />
        </View>

        <View className="flex-1 items-center justify-center">
          <AppLogo className="mb-7" elevated size={104} />

          <Text className="text-4xl font-extrabold tracking-tight text-slate-900">
            Tent
          </Text>
          <Text className="mt-3 text-center text-lg font-semibold leading-6 text-slate-700">
            Rentals, bills, and cash flow in one calm place.
          </Text>
          <Text className="mt-3 max-w-[320px] text-center text-[15px] leading-6 text-slate-500">
            Track properties, tenants, utility bills, and cashbooks without
            juggling spreadsheets.
          </Text>

          <View className="mt-8 flex-row items-center rounded-2xl bg-slate-50 px-4 py-3">
            <MaterialCommunityIcons
              name="cloud-off-outline"
              size={20}
              color="#059669"
            />
            <Text className="ml-2.5 flex-1 text-[13px] leading-5 text-slate-600">
              Works offline. Everything you enter is kept on this device.
            </Text>
          </View>
        </View>

        <PrimaryButton
          icon="arrow-right"
          label="Let's Get Started"
          onPress={() => router.push("/onboarding/profile")}
        />
      </View>
    </SafeAreaView>
  );
}
