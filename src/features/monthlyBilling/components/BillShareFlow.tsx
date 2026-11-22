import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { InvoiceSettings } from "../../invoiceSettings/types";
import type { BillShareTarget } from "../logic/billShare";
import { BillInvoiceModal } from "./BillInvoiceModal";
import { BillShareSheet } from "./BillShareSheet";

/** One modal so the picker and invoice preview share a single native modal. */
export function BillShareFlow({
  target,
  selectedIds,
  confirmedIds,
  invoiceSettings,
  onChange,
  onClose,
  onBack,
  onShare,
}: {
  target: BillShareTarget;
  selectedIds: readonly string[];
  confirmedIds: string[] | null;
  invoiceSettings: InvoiceSettings;
  onChange: (selectedBillIds: string[]) => void;
  onClose: () => void;
  onBack: () => void;
  onShare: (selectedBillIds: string[]) => void;
}) {
  const preview = confirmedIds !== null;

  return (
    <Modal
      animationType="slide"
      onRequestClose={preview ? onBack : onClose}
      statusBarTranslucent
      transparent
      visible
    >
      {preview ? (
        <BillInvoiceModal
          invoiceSettings={invoiceSettings}
          onBack={onBack}
          onClose={onClose}
          selectedBillIds={confirmedIds}
          target={target}
        />
      ) : (
        <View className="flex-1 justify-end bg-black/40">
          <Pressable
            accessibilityLabel="Close utility selection"
            className="absolute inset-0"
            onPress={onClose}
          />
          <SafeAreaView
            edges={["bottom"]}
            style={{ backgroundColor: "#fff", maxHeight: "88%" }}
          >
            <BillShareSheet
              onChange={onChange}
              onClose={onClose}
              onShare={onShare}
              selectedIds={selectedIds}
              target={target}
            />
          </SafeAreaView>
        </View>
      )}
    </Modal>
  );
}
