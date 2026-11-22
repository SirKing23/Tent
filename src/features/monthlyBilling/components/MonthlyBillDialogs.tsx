import { useRouter } from "expo-router";

import type { MonthlyBillDialogsState } from "../hooks/useMonthlyBillDialogs";
import { BillShareFlow } from "./BillShareFlow";
import { MonthlyBillEntryModal } from "./MonthlyBillEntryModal";
import { OneOffBillActionsModal } from "./OneOffBillActionsModal";

/** Renders the entry, share-picker, and invoice dialogs owned by the hook. */
export function MonthlyBillDialogs({
  dialogs,
}: {
  dialogs: MonthlyBillDialogsState;
}) {
  const router = useRouter();
  const {
    target,
    closeTarget,
    clearTargetPayment,
    removeTarget,
    saveTarget,
    saveTargetPayment,
    oneOffTarget,
    closeOneOffActions,
    deleteOneOffBill,
    period,
    shareTarget,
    shareDraft,
    shareSelection,
    invoiceSettings,
    updateShareDraft,
    closeShare,
    confirmShareSelection,
    backToShareSelection,
  } = dialogs;

  const editOneOffBill = () => {
    if (!oneOffTarget) return;
    const { property, bill } = oneOffTarget;
    closeOneOffActions();
    router.push({
      pathname: "/bills-AddNewBill",
      params: {
        id: bill.id,
        monthlyPeriod: period,
        monthlyPropertyId: property.id,
      },
    });
  };

  return (
    <>
      {target ? (
        <MonthlyBillEntryModal
          key={`${target.property.id}:${target.bill.id}:${target.mode}:${target.paymentOnly ? "payment" : "entry"}`}
          onClearPayment={
            target.entry?.paidAt ? () => clearTargetPayment() : undefined
          }
          onClose={closeTarget}
          onRemove={
            target.entry && !target.paymentOnly ? removeTarget : undefined
          }
          onSave={(values) => void saveTarget(values)}
          onSavePayment={(values) => void saveTargetPayment(values)}
          target={target}
        />
      ) : null}

      {oneOffTarget ? (
        <OneOffBillActionsModal
          key={`${oneOffTarget.property.id}:${oneOffTarget.bill.id}`}
          onClose={closeOneOffActions}
          onDelete={deleteOneOffBill}
          onEdit={editOneOffBill}
          period={period}
          target={oneOffTarget}
        />
      ) : null}

      {shareTarget ? (
        <BillShareFlow
          key={`${shareTarget.kind}:${shareTarget.property.id}:${shareTarget.period}`}
          confirmedIds={shareSelection}
          invoiceSettings={invoiceSettings}
          onBack={backToShareSelection}
          onChange={updateShareDraft}
          onClose={closeShare}
          onShare={confirmShareSelection}
          selectedIds={shareDraft}
          target={shareTarget}
        />
      ) : null}
    </>
  );
}
