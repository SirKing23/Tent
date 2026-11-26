import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import { getCurrentPeriod } from "../../../utils/period";
import type { BillingItem } from "../../bills/types";
import type { Property } from "../../properties/types";
import { useMonthlyBilling } from "../hooks/useMonthlyBilling";
import {
  buildPhotoTagOptions,
  buildPhotoTagTarget,
} from "../logic/photoTag";
import { BillPhotoTagSheet } from "./BillPhotoTagSheet";
import {
  MonthlyBillEntryModal,
  type MonthlyBillEntryTarget,
} from "./MonthlyBillEntryModal";

export type TaggedPhotoResult = {
  propertyName: string;
  billName: string;
};

/**
 * Guides a freshly captured photo to a bill entry: pick the month, property
 * and bill, then save the usual entry form with the photo attached.
 */
export function PhotoTagFlow({
  photoUri,
  onClose,
  onSaved,
}: {
  photoUri: string;
  onClose: () => void;
  onSaved: (result: TaggedPhotoResult) => void;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState(getCurrentPeriod);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  );
  const [target, setTarget] = useState<MonthlyBillEntryTarget | null>(null);
  const billing = useMonthlyBilling(period);
  const {
    properties,
    bills,
    monthlyOnlyBills,
    entries,
    entryFor,
    previousEntryFor,
    isLoading,
    saveEntry,
  } = billing;

  const options = useMemo(
    () =>
      buildPhotoTagOptions({
        properties,
        bills,
        monthlyOnlyBills,
        period,
      }),
    [bills, monthlyOnlyBills, period, properties],
  );

  const selectedOption =
    options.find((option) => option.property.id === selectedPropertyId) ?? null;

  const recordedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const entry of entries) {
      keys.add(`${entry.propertyId}:${entry.billingItemId}`);
    }
    return keys;
  }, [entries]);

  const openBill = useCallback(
    (bill: BillingItem) => {
      if (!selectedOption) return;
      const property = selectedOption.property;
      const parentEntry =
        property.type === "Unit" && property.parentBuildingId
          ? entryFor(property.parentBuildingId, bill.id)
          : undefined;

      setTarget(
        buildPhotoTagTarget({
          property,
          bill,
          photoUri,
          entry: entryFor(property.id, bill.id),
          previousEntry: previousEntryFor(property.id, bill.id),
          parentEntry,
        }),
      );
    },
    [entryFor, photoUri, previousEntryFor, selectedOption],
  );

  const handleSave = useCallback(
    async (values: {
      reading?: number;
      previousReading?: number;
      amount?: number;
      photoUri?: string;
    }) => {
      if (!target) return;
      const { property, bill } = target;
      try {
        await saveEntry({
          propertyId: property.id,
          billingItemId: bill.id,
          reading: values.reading,
          previousReading: values.previousReading,
          amount: values.amount,
          photoUri: values.photoUri,
        });
        setTarget(null);
        onSaved({ propertyName: property.name, billName: bill.name });
      } catch (error) {
        console.error("Unable to tag photo to bill entry:", error);
        Alert.alert(
          "Save failed",
          "The photo could not be tagged. Please try again.",
        );
      }
    },
    [onSaved, saveEntry, target],
  );

  const handleAddBill = useCallback(
    (property: Property) => {
      onClose();
      router.push({
        pathname: "/bills-AddNewBill",
        params: { monthlyPeriod: period, monthlyPropertyId: property.id },
      });
    },
    [onClose, period, router],
  );

  if (target) {
    return (
      <MonthlyBillEntryModal
        key={`${target.property.id}:${target.bill.id}:${target.mode}`}
        onClose={() => setTarget(null)}
        onSave={(values) => void handleSave(values)}
        target={target}
      />
    );
  }

  return (
    <BillPhotoTagSheet
      isLoading={isLoading}
      onAddBill={handleAddBill}
      onBack={() => setSelectedPropertyId(null)}
      onChangePeriod={setPeriod}
      onClose={onClose}
      onSelectBill={openBill}
      onSelectProperty={setSelectedPropertyId}
      options={options}
      period={period}
      photoUri={photoUri}
      recordedKeys={recordedKeys}
      selected={selectedOption}
    />
  );
}
