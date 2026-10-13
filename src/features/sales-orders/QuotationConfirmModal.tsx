import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/formatters';
import { SalesOrder } from '@/types/sales-order';

export interface QuotationConfirmModalProps {
  visible: boolean;
  order: SalesOrder;
  isConfirming: boolean;
  serverError?: string | null;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}

export function QuotationConfirmModal({
  visible,
  order,
  isConfirming,
  serverError,
  onConfirm,
  onClose,
}: QuotationConfirmModalProps) {
  const handleConfirm = async () => {
    const success = await onConfirm();
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-done-circle" size={44} color="#059669" />
          </View>

          <Text style={styles.title}>Confirm Quotation</Text>
          <Text style={styles.subtitle}>
            Are you sure you want to confirm quotation <Text style={styles.bold}>{order.name}</Text>?
          </Text>

          {serverError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Customer:</Text>
              <Text style={styles.summaryValue}>{order.customerName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount:</Text>
              <Text style={[styles.summaryValue, styles.bold]}>
                {formatCurrency(order.amountTotal, order.currencySymbol)}
              </Text>
            </View>
          </View>

          <Text style={styles.helperText}>
            This will convert the quotation into an active Sales Order in Odoo ERP and reserve inventory lines.
          </Text>

          <View style={styles.actionsRow}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              size="md"
              style={styles.cancelBtn}
            />
            <Button
              title="Confirm Order"
              onPress={handleConfirm}
              variant="primary"
              size="md"
              loading={isConfirming}
              style={styles.confirmBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 13,
    color: '#0F172A',
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
  },
  confirmBtn: {
    flex: 1,
  },
});
