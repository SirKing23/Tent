import { Stack, useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import "../../global.css";
import { InvoiceSettingsForm } from "../features/invoiceSettings/components/InvoiceSettingsForm";
import { useInvoiceSettings } from "../features/invoiceSettings/hooks/useInvoiceSettings";

export default function InvoiceSettingsScreen() {
  const router = useRouter();
  const { settings, isLoading, save } = useInvoiceSettings();

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9fc]" edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "Invoice" }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4C45F5" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <InvoiceSettingsForm
            settings={settings}
            onSave={async (next) => {
              await save(next);
              router.back();
            }}
          />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
