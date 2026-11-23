import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { resolvePhotoUri } from "../../../services/photoStorage";
import { formatCurrency } from "../../../utils/currency";
import { getTenantName } from "../../tenants/logic/tenantRules";
import type { Tenant } from "../../tenants/types";
import {
  getUtilityIcon,
  getUtilityIconStyle,
} from "../../bills/components/utilityIcons";
import type { BillingItem } from "../../bills/types";

export function BillDetailModal({
  bill,
  onClose,
}: {
  bill: BillingItem | null;
  onClose: () => void;
}) {
  if (!bill) return null;
  const { backgroundColor, iconColor } = getUtilityIconStyle(bill.utilityType);

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose} visible>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={[styles.modalIconWrap, { backgroundColor }]}>
            <MaterialCommunityIcons
              color={iconColor}
              name={getUtilityIcon(bill.utilityType)}
              size={32}
            />
          </View>
          <Text style={styles.modalTitle}>{bill.name}</Text>
          <Text style={styles.modalSub}>
            {bill.utilityType} · {bill.billingType}
          </Text>
          {bill.defaultAmount !== undefined && (
            <Text style={styles.modalAmount}>
              {formatCurrency(bill.defaultAmount)}
            </Text>
          )}
          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>Display unit</Text>
            <Text style={styles.modalValue}>{bill.displayUnit || "—"}</Text>
          </View>
          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>Due date</Text>
            <Text style={styles.modalValue}>{bill.dueDateType}</Text>
          </View>
          {bill.fixedDueDate ? (
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Fixed date</Text>
              <Text style={styles.modalValue}>{bill.fixedDueDate}</Text>
            </View>
          ) : null}
          {bill.recurringRule ? (
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Recurring rule</Text>
              <Text style={styles.modalValue}>{bill.recurringRule}</Text>
            </View>
          ) : null}
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function TenantDetailModal({
  tenant,
  onClose,
}: {
  tenant: Tenant | null;
  onClose: () => void;
}) {
  if (!tenant) return null;
  const statusBg =
    tenant.tenantStatus === "Active"
      ? "#e3f8f0"
      : tenant.tenantStatus === "Inactive"
        ? "#fff1dd"
        : "#eef0ff";
  const statusColor =
    tenant.tenantStatus === "Active"
      ? "#009a61"
      : tenant.tenantStatus === "Inactive"
        ? "#d96a00"
        : "#5146e5";

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose} visible>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {tenant.photo ? (
            <Image
              source={{ uri: resolvePhotoUri(tenant.photo) ?? tenant.photo }}
              style={styles.tenantModalPhoto}
            />
          ) : (
            <View style={styles.tenantModalAvatar}>
              <Text style={styles.tenantModalAvatarText}>
                {`${tenant.firstName[0] ?? ""}${tenant.lastName[0] ?? ""}`}
              </Text>
            </View>
          )}
          <Text style={styles.modalTitle}>{getTenantName(tenant)}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>
              {tenant.tenantStatus}
            </Text>
          </View>
          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>Phone</Text>
            <Text style={styles.modalValue}>{tenant.phone}</Text>
          </View>
          {tenant.email ? (
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Email</Text>
              <Text style={styles.modalValue}>{tenant.email}</Text>
            </View>
          ) : null}
          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>ID type</Text>
            <Text style={styles.modalValue}>{tenant.idType}</Text>
          </View>
          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>ID number</Text>
            <Text style={styles.modalValue}>{tenant.idNumber}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,10,24,0.72)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    alignItems: "center",
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0d162a",
    marginBottom: 4,
    textAlign: "center",
  },
  modalSub: { fontSize: 13, color: "#637b99", marginBottom: 6 },
  modalAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#5041df",
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#eef1f6",
  },
  modalLabel: { fontSize: 13, color: "#637b99" },
  modalValue: { fontSize: 13, fontWeight: "600", color: "#0d162a" },
  modalClose: {
    marginTop: 20,
    backgroundColor: "#5041df",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  modalCloseText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  tenantModalPhoto: { width: 80, height: 80, borderRadius: 24, marginBottom: 10 },
  tenantModalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#6548ee",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tenantModalAvatarText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  statusPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  statusPillText: { fontSize: 11, fontWeight: "700" },
});
