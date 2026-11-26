import { useCallback, useState } from "react";
import { Alert } from "react-native";

import type { PaymentMode } from "../../../constants/payments";
import { formatPeriodLabel } from "../../../utils/period";
import { isSubMeterEligible } from "../../bills/logic/billingRules";
import type { BillingItem } from "../../bills/types";
import { useInvoiceSettings } from "../../invoiceSettings/hooks/useInvoiceSettings";
import type { Property } from "../../properties/types";
import type { MonthlyBillEntryTarget } from "../components/MonthlyBillEntryModal";
import type { OneOffBillActionTarget } from "../components/OneOffBillActionsModal";
import type { PaymentValues } from "../components/PaymentTab";
import {
  buildBuildingShareTarget,
  buildUnitShareTarget,
  getDefaultShareSelection,
  type BillShareTarget,
} from "../logic/billShare";
import { suggestPreviousReading } from "../logic/monthlyBilling";
import type {
  BuildingBillLine,
  BuildingMonthlyBilling,
  UnitBillLine,
  UnitMonthlyBilling,
} from "../types";
import { useMonthlyBilling } from "./useMonthlyBilling";

/** Split, per-person and fixed-share lines only accept payment details. */
const isEditableLine = (line: UnitBillLine) =>
  line.source === "sub-meter" || line.source === "independent";

/** Monthly billing data plus the entry/payment dialog shared by both screens. */
export function useMonthlyBillDialogs(period: string) {
  const billing = useMonthlyBilling(period);
  const { settings: invoiceSettings } = useInvoiceSettings();
  const {
    clearPayment,
    deleteMonthlyOnlyBill,
    entryFor,
    previousEntryFor,
    removeEntry,
    saveEntry,
    savePayment,
    tenants,
  } = billing;
  const [target, setTarget] = useState<MonthlyBillEntryTarget | null>(null);
  const [oneOffTarget, setOneOffTarget] =
    useState<OneOffBillActionTarget | null>(null);
  const [shareTarget, setShareTarget] = useState<BillShareTarget | null>(null);
  const [shareDraft, setShareDraft] = useState<string[]>([]);
  const [shareSelection, setShareSelection] = useState<string[] | null>(null);

  const openBuildingBill = useCallback(
    (property: Property, line: BuildingBillLine) => {
      setTarget({
        property,
        bill: line.bill,
        mode: isSubMeterEligible(line.bill.billingType) ? "invoice" : "amount",
        entry: line.entry,
        rate: line.rate,
        amountSuggestion: line.invoiceAmount,
        previousReadingSuggestion: suggestPreviousReading(
          previousEntryFor(property.id, line.bill.id),
        ),
      });
    },
    [previousEntryFor],
  );

  const openUnitBill = useCallback(
    (unit: Property, line: UnitBillLine, rate: number | undefined) => {
      const editable = isEditableLine(line);
      setTarget({
        property: unit,
        bill: line.bill,
        mode: line.source === "independent" ? "amount" : "reading",
        paymentOnly: !editable,
        photoOnly: line.source === "fixed-share",
        entry: entryFor(unit.id, line.bill.id),
        rate,
        previousReadingSuggestion: suggestPreviousReading(
          previousEntryFor(unit.id, line.bill.id),
        ),
      });
    },
    [entryFor, previousEntryFor],
  );

  const openOneOffActions = useCallback(
    (property: Property, bill: BillingItem) =>
      setOneOffTarget({ property, bill }),
    [],
  );

  const closeOneOffActions = useCallback(() => setOneOffTarget(null), []);

  const deleteOneOffBill = useCallback(() => {
    if (!oneOffTarget) return;
    const { property, bill } = oneOffTarget;
    setOneOffTarget(null);
    Alert.alert(
      "Delete one-off bill?",
      `"${bill.name}" and its recorded amount and payment for ${formatPeriodLabel(period)} will be removed. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteMonthlyOnlyBill(property.id, bill.id);
              } catch (error) {
                console.error("Unable to delete one-off bill:", error);
                Alert.alert(
                  "Delete failed",
                  "The one-off bill could not be deleted. Please try again.",
                );
              }
            })();
          },
        },
      ],
    );
  }, [deleteMonthlyOnlyBill, oneOffTarget, period]);

  const openBuildingShare = useCallback(
    (billingReport: BuildingMonthlyBilling) => {
      const nextTarget = buildBuildingShareTarget({
        billing: billingReport,
        period,
        tenants,
      });
      setShareTarget(nextTarget);
      setShareDraft(getDefaultShareSelection(nextTarget));
      setShareSelection(null);
    },
    [period, tenants],
  );

  const openUnitShare = useCallback(
    (unit: UnitMonthlyBilling) => {
      const nextTarget = buildUnitShareTarget({ unit, period });
      setShareTarget(nextTarget);
      setShareDraft(getDefaultShareSelection(nextTarget));
      setShareSelection(null);
    },
    [period],
  );

  const closeShare = useCallback(() => {
    setShareTarget(null);
    setShareDraft([]);
    setShareSelection(null);
  }, []);

  const confirmShareSelection = useCallback((selectedBillIds: string[]) => {
    setShareDraft(selectedBillIds);
    setShareSelection(selectedBillIds);
  }, []);

  const backToShareSelection = useCallback(() => setShareSelection(null), []);

  const saveTarget = useCallback(
    async (values: {
      reading?: number;
      previousReading?: number;
      amount?: number;
      photoUri?: string;
    }) => {
      if (!target) return;
      try {
        await saveEntry({
          propertyId: target.property.id,
          billingItemId: target.bill.id,
          reading: values.reading,
          previousReading: values.previousReading,
          amount: values.amount,
          photoUri: values.photoUri,
        });
        setTarget(null);
      } catch (error) {
        console.error("Unable to save monthly bill entry:", error);
        Alert.alert(
          "Save failed",
          "The monthly amount could not be saved. Please try again.",
        );
      }
    },
    [saveEntry, target],
  );

  const clearTarget = useCallback(async () => {
    if (!target) return;
    try {
      await removeEntry(target.property.id, target.bill.id);
      setTarget(null);
    } catch (error) {
      console.error("Unable to remove monthly bill entry:", error);
      Alert.alert("Remove failed", "Please try again.");
    }
  }, [removeEntry, target]);

  const removeTarget = useCallback(() => {
    if (!target) return;
    Alert.alert(
      "Remove entry?",
      "This clears the recorded reading and amount for this bill in the selected month.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void clearTarget(),
        },
      ],
    );
  }, [clearTarget, target]);

  const saveTargetPayment = useCallback(
    async (values: PaymentValues) => {
      if (!target) return;
      try {
        await savePayment({
          propertyId: target.property.id,
          billingItemId: target.bill.id,
          ...values,
        });
        setTarget(null);
      } catch (error) {
        console.error("Unable to save payment:", error);
        Alert.alert(
          "Save failed",
          "The payment details could not be saved. Please try again.",
        );
      }
    },
    [savePayment, target],
  );

  const clearTargetPayment = useCallback(() => {
    if (!target) return;
    const { property, bill } = target;
    Alert.alert(
      "Mark as unpaid?",
      "This clears the payment date, mode, description, and proof photo.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark unpaid",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await clearPayment(property.id, bill.id);
                setTarget(null);
              } catch (error) {
                console.error("Unable to clear payment:", error);
                Alert.alert("Update failed", "Please try again.");
              }
            })();
          },
        },
      ],
    );
  }, [clearPayment, target]);

  return {
    ...billing,
    period,
    target,
    openBuildingBill,
    openUnitBill,
    saveTarget,
    removeTarget,
    saveTargetPayment,
    clearTargetPayment,
    closeTarget: () => setTarget(null),
    oneOffTarget,
    openOneOffActions,
    closeOneOffActions,
    deleteOneOffBill,
    shareTarget,
    shareDraft,
    shareSelection,
    invoiceSettings,
    openBuildingShare,
    openUnitShare,
    updateShareDraft: setShareDraft,
    confirmShareSelection,
    backToShareSelection,
    closeShare,
  };
}

export type MonthlyBillDialogsState = ReturnType<typeof useMonthlyBillDialogs>;

export type { PaymentMode };
