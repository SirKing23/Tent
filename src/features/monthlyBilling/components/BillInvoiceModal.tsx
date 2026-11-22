import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  buildInvoiceFileName,
  saveInvoiceImage,
  shareInvoiceImage,
} from "../../../services/invoiceImage";
import { resolvePhotoUri } from "../../../services/photoStorage";
import { formatPeso } from "../../../utils/currency";
import { formatDateMDY } from "../../../utils/date";
import { formatPeriodLabel } from "../../../utils/period";
import {
  getUtilityIcon,
  getUtilityIconStyle,
} from "../../bills/components/utilityIcons";
import type { InvoiceSettings } from "../../invoiceSettings/types";
import { getPropertyAddress } from "../../properties/logic/propertyRules";
import {
  getInvoiceTotal,
  getSelectedBills,
  type BillShareTarget,
  type ShareableBill,
} from "../logic/billShare";

const formatReading = (bill: ShareableBill): string | undefined => {
  const unit = bill.displayUnit || "units";
  const value = (amount: number) =>
    amount.toLocaleString("en-PH", { maximumFractionDigits: 2 });

  if (bill.previousReading !== undefined && bill.reading !== undefined) {
    const reading = `${value(bill.previousReading)} → ${value(bill.reading)} ${unit}`;
    return bill.consumption !== undefined
      ? `${reading} · ${value(bill.consumption)} ${unit} used`
      : reading;
  }
  if (bill.consumption !== undefined) {
    return `${value(bill.consumption)} ${unit} used`;
  }
  if (bill.reading !== undefined) {
    return `${value(bill.reading)} ${unit} reading`;
  }
  return undefined;
};

const invoiceNumberFor = (target: BillShareTarget): string => {
  const propertyCode =
    target.property.id
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 5)
      .toUpperCase() || "PROP";
  return `${target.period.replace("-", "")}-${propertyCode}`;
};

/** Full-screen invoice preview with image share and download actions. */
export function BillInvoiceModal({
  target,
  selectedBillIds,
  invoiceSettings,
  onBack,
  onClose,
}: {
  target: BillShareTarget;
  selectedBillIds: readonly string[];
  invoiceSettings: InvoiceSettings;
  onBack: () => void;
  onClose: () => void;
}) {
  const invoiceRef = useRef<ComponentRef<typeof View>>(null);
  const { width } = useWindowDimensions();
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const iconSource = resolvePhotoUri(invoiceSettings.iconUri);
  const footerSource = resolvePhotoUri(invoiceSettings.footerImageUri);
  const paymentNote = invoiceSettings.paymentNote.trim();

  const bills = getSelectedBills(target, selectedBillIds);
  const total = getInvoiceTotal(bills);
  const invoiceWidth = Math.min(width - 40, 400);
  const issuedDate = formatDateMDY(new Date());
  const invoiceNumber = invoiceNumberFor(target);
  const fileName = buildInvoiceFileName(target.property.name, target.period);
  const recipients =
    target.recipients.length > 0
      ? target.recipients.join(", ")
      : "Property owner";

  const handleShare = async () => {
    if (busy) return;
    setBusy("share");
    try {
      const result = await shareInvoiceImage(invoiceRef, fileName);
      if (result === "downloaded") {
        Alert.alert(
          "Invoice downloaded",
          "The invoice image was saved to your downloads.",
        );
      }
    } catch (error) {
      console.error("Unable to share invoice:", error);
      Alert.alert(
        "Share failed",
        "The invoice image could not be shared. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy("download");
    try {
      const result = await saveInvoiceImage(invoiceRef, fileName);
      if (result === "saved") {
        Alert.alert(
          "Saved to Photos",
          "The invoice image is now in your photo library.",
        );
      } else if (result === "downloaded") {
        Alert.alert(
          "Invoice downloaded",
          "The invoice image was saved to your downloads.",
        );
      } else {
        Alert.alert(
          "Photos access needed",
          "Allow Tent to add photos in your device settings, then try again.",
        );
      }
    } catch (error) {
      console.error("Unable to save invoice:", error);
      Alert.alert(
        "Download failed",
        "The invoice image could not be saved. Please try again.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0d162a]" edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          accessibilityLabel="Back to utility selection"
          className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:opacity-70"
          onPress={onBack}
        >
          <MaterialCommunityIcons color="#fff" name="chevron-left" size={24} />
        </Pressable>
        <Text className="text-[14px] font-extrabold text-white">
          Invoice preview
        </Text>
        <Pressable
          accessibilityLabel="Close invoice preview"
          className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:opacity-70"
          onPress={onClose}
        >
          <MaterialCommunityIcons color="#fff" name="close" size={20} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 28, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center px-5">
          <View
            ref={invoiceRef}
            collapsable={false}
            renderToHardwareTextureAndroid
            style={[styles.card, { width: invoiceWidth }]}
          >
            <View style={styles.brandRow}>
              <View style={styles.brandGroup}>
                <View style={styles.brandMark}>
                  {iconSource ? (
                    <Image
                      resizeMode="cover"
                      source={{ uri: iconSource }}
                      style={styles.brandImage}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      color="#fff"
                      name="office-building"
                      size={22}
                    />
                  )}
                </View>
                <View style={styles.brandText}>
                  <Text numberOfLines={1} style={styles.brandName}>
                    {invoiceSettings.title}
                  </Text>
                  {invoiceSettings.subtitle.trim() ? (
                    <Text numberOfLines={1} style={styles.brandCaption}>
                      {invoiceSettings.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.invoiceHeading}>
                <Text style={styles.invoiceTitle}>INVOICE</Text>
                <Text style={styles.invoiceMeta}>#{invoiceNumber}</Text>
                <Text style={styles.invoiceMeta}>Issued {issuedDate}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.partyRow}>
              <View style={styles.partyColumn}>
                <Text style={styles.sectionLabel}>BILL TO</Text>
                <Text numberOfLines={2} style={styles.partyName}>
                  {recipients}
                </Text>
                <Text style={styles.partyMeta}>{target.property.name}</Text>
                <Text numberOfLines={2} style={styles.partyMeta}>
                  {getPropertyAddress(target.property) || "No address added"}
                </Text>
              </View>
              <View style={styles.periodColumn}>
                <Text style={styles.sectionLabel}>BILLING PERIOD</Text>
                <Text style={styles.partyName}>
                  {formatPeriodLabel(target.period)}
                </Text>
                <Text style={styles.partyMeta}>
                  {target.kind === "building" ? "Building" : "Unit"}
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, styles.utilitiesLabel]}>
              UTILITIES
            </Text>

            {bills.length === 0 ? (
              <Text style={styles.emptyText}>
                No utilities were selected for this invoice.
              </Text>
            ) : (
              bills.map((bill) => {
                const iconStyle = getUtilityIconStyle(bill.utilityType);
                const reading = formatReading(bill);
                const meta = [
                  bill.utilityType,
                  bill.dueDate ? `Due ${bill.dueDate}` : "No due date",
                  reading,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <View key={bill.id} style={styles.billRow}>
                    <View
                      style={[
                        styles.billIcon,
                        { backgroundColor: iconStyle.backgroundColor },
                      ]}
                    >
                      <MaterialCommunityIcons
                        color={iconStyle.iconColor}
                        name={getUtilityIcon(bill.utilityType)}
                        size={16}
                      />
                    </View>
                    <View style={styles.billInfo}>
                      <Text numberOfLines={1} style={styles.billName}>
                        {bill.name}
                      </Text>
                      <Text numberOfLines={2} style={styles.billMeta}>
                        {meta}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.billAmount,
                        bill.amount === undefined && styles.unrecordedAmount,
                      ]}
                    >
                      {bill.amount === undefined
                        ? "Not recorded"
                        : formatPeso(bill.amount)}
                    </Text>
                  </View>
                );
              })
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL DUE</Text>
              <Text style={styles.totalValue}>{formatPeso(total)}</Text>
            </View>

            {paymentNote ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>Payment note</Text>
                <Text style={styles.noteText}>{paymentNote}</Text>
              </View>
            ) : null}

            {footerSource ? (
              <View style={styles.footerImageFrame}>
                <Image
                  resizeMode="contain"
                  source={{ uri: footerSource }}
                  style={styles.footerImage}
                />
              </View>
            ) : null}

            <Text style={styles.generated}>
              Generated by Tent on {issuedDate}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="flex-row gap-3 border-t border-white/10 px-4 pb-1 pt-3">
        <Pressable
          accessibilityLabel="Download invoice as image"
          className="h-[52px] flex-1 flex-row items-center justify-center rounded-2xl bg-white/10 active:opacity-70"
          disabled={Boolean(busy)}
          onPress={() => void handleDownload()}
        >
          {busy === "download" ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons
                color="#fff"
                name="download-outline"
                size={19}
              />
              <Text className="ml-2 text-[13px] font-extrabold text-white">
                Download
              </Text>
            </>
          )}
        </Pressable>
        <Pressable
          accessibilityLabel="Share invoice image"
          className="h-[52px] flex-row items-center justify-center rounded-2xl bg-[#4C45F5] active:opacity-80"
          disabled={Boolean(busy)}
          onPress={() => void handleShare()}
          style={{ flex: 1.3 }}
        >
          {busy === "share" ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons
                color="#fff"
                name="share-variant-outline"
                size={19}
              />
              <Text className="ml-2 text-[13px] font-extrabold text-white">
                Share
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
  },
  brandRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brandGroup: { alignItems: "center", flexDirection: "row", flexShrink: 1 },
  brandMark: {
    alignItems: "center",
    backgroundColor: "#4C45F5",
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: 42,
  },
  brandImage: { height: "100%", width: "100%" },
  brandText: { flexShrink: 1, marginLeft: 10 },
  brandName: {
    color: "#0d162a",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  brandCaption: { color: "#7c8ba1", fontSize: 9, marginTop: 1 },
  invoiceHeading: { alignItems: "flex-end" },
  invoiceTitle: {
    color: "#0d162a",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2.2,
  },
  invoiceMeta: { color: "#7c8ba1", fontSize: 8.5, marginTop: 1 },
  divider: { backgroundColor: "#e4eaf2", height: 1, marginVertical: 16 },
  partyRow: { flexDirection: "row", justifyContent: "space-between" },
  partyColumn: { flex: 1, paddingRight: 12 },
  periodColumn: { alignItems: "flex-end", maxWidth: "42%" },
  sectionLabel: {
    color: "#8091b1",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  partyName: {
    color: "#0d162a",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  partyMeta: { color: "#637b99", fontSize: 9.5, marginTop: 2 },
  utilitiesLabel: { marginBottom: 2, marginTop: 20 },
  emptyText: { color: "#8b9bb0", fontSize: 11, paddingVertical: 12 },
  billRow: {
    alignItems: "center",
    borderBottomColor: "#eef1f6",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: 9,
  },
  billIcon: {
    alignItems: "center",
    borderRadius: 9,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  billInfo: { flex: 1, marginLeft: 9, paddingRight: 8 },
  billName: { color: "#0d162a", fontSize: 11.5, fontWeight: "800" },
  billMeta: { color: "#7c8ba1", fontSize: 8.5, marginTop: 1.5 },
  billAmount: { color: "#0d162a", fontSize: 11, fontWeight: "800" },
  unrecordedAmount: { color: "#B45309", fontSize: 9 },
  totalRow: {
    alignItems: "center",
    backgroundColor: "#11183F",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  totalLabel: {
    color: "#B7BFE7",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  totalValue: { color: "#fff", fontSize: 18, fontWeight: "900" },
  noteBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginTop: 14,
    padding: 12,
  },
  noteTitle: {
    color: "#4C45F5",
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  noteText: { color: "#637b99", fontSize: 9, lineHeight: 13, marginTop: 4 },
  footerImageFrame: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: "#eef1f6",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 6,
  },
  footerImage: { height: 140, width: 140 },
  generated: {
    color: "#9aa9bd",
    fontSize: 8,
    marginTop: 14,
    textAlign: "center",
  },
});
