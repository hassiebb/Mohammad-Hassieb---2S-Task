import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSalesOrderDetails } from '@/features/sales-orders/use-sales-order-details';
import { QuotationConfirmModal } from '@/features/sales-orders/QuotationConfirmModal';
import { RoleGuard } from '@/components/RoleGuard';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Palette } from '@/constants/colors';
import { formatCurrency, formatDate } from '@/lib/formatters';

export default function SalesOrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    order,
    isLoading,
    isConfirming,
    error,
    confirmSuccess,
    confirmQuotation,
    clearSuccess,
  } = useSalesOrderDetails(id || '');

  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);

  return (
    <RoleGuard>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Back to sales order list"
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {order ? `Order ${order.name}` : 'Sales Order Details'}
          </Text>
          <View style={styles.headerRightSpacer} />
        </View>

        {isLoading ? (
          <LoadingSpinner message="Loading sales order..." />
        ) : !order ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Order Not Found"
            description={error || `Could not find sales order with ID: ${id}`}
            actionTitle="Back to Orders"
            onAction={() => router.back()}
          />
        ) : (
          <>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {/* Success Banner */}
              {confirmSuccess && (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#065F46" />
                  <Text style={styles.successBannerText}>
                    Quotation confirmed successfully! Now an active Sales Order.
                  </Text>
                  <Pressable onPress={clearSuccess} hitSlop={6}>
                    <Ionicons name="close" size={16} color="#065F46" />
                  </Pressable>
                </View>
              )}

              {/* Error Banner */}
              {error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              {/* Order Overview Card */}
              <Card elevated style={styles.overviewCard}>
                <View style={styles.overviewHeader}>
                  <View>
                    <Text style={styles.orderTitle}>{order.name}</Text>
                    <Text style={styles.customerName}>{order.customerName}</Text>
                  </View>
                  <Badge status={order.state} label="" />
                </View>

                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Order Date</Text>
                    <Text style={styles.metaValue}>{formatDate(order.dateOrder)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Salesperson</Text>
                    <Text style={styles.metaValue}>{order.salesperson || 'Unassigned'}</Text>
                  </View>
                  {Boolean(order.paymentTerm) && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Payment Terms</Text>
                      <Text style={styles.metaValue}>{order.paymentTerm}</Text>
                    </View>
                  )}
                </View>
              </Card>

              {/* Product Lines Section */}
              <Card style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Order Lines</Text>
                  <Text style={styles.linesCount}>
                    {order.lines.length} {order.lines.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>

                <View style={styles.linesList}>
                  {order.lines.map((line, index) => (
                    <View
                      key={line.id}
                      style={[
                        styles.lineItem,
                        index < order.lines.length - 1 && styles.lineDivider,
                      ]}>
                      <View style={styles.lineMain}>
                        <Text style={styles.lineProductName}>{line.productName}</Text>
                        {Boolean(line.description) && (
                          <Text style={styles.lineDescription}>{line.description}</Text>
                        )}
                        <Text style={styles.lineQuantity}>
                          {line.productUomQty} units ×{' '}
                          {formatCurrency(line.priceUnit, order.currencySymbol)}
                          {line.discount ? ` (${line.discount}% disc)` : ''}
                        </Text>
                      </View>
                      <Text style={styles.lineSubtotal}>
                        {formatCurrency(line.priceSubtotal, order.currencySymbol)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>

              {/* Financial Totals Card */}
              <Card style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Order Totals</Text>

                <View style={styles.totalsTable}>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Untaxed Amount:</Text>
                    <Text style={styles.totalsValue}>
                      {formatCurrency(order.amountUntaxed, order.currencySymbol)}
                    </Text>
                  </View>

                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Taxes (VAT):</Text>
                    <Text style={styles.totalsValue}>
                      {formatCurrency(order.amountTax, order.currencySymbol)}
                    </Text>
                  </View>

                  <View style={[styles.totalsRow, styles.totalsGrandRow]}>
                    <Text style={styles.totalsGrandLabel}>Total:</Text>
                    <Text style={styles.totalsGrandValue}>
                      {formatCurrency(order.amountTotal, order.currencySymbol)}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Order Notes (if present) */}
              {Boolean(order.notes) && (
                <Card style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Terms & Notes</Text>
                  <Text style={styles.notesText}>{order.notes}</Text>
                </Card>
              )}
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={styles.bottomBar}>
              {order.state === 'draft' || order.state === 'sent' ? (
                <Button
                  title="Confirm Quotation"
                  onPress={() => setIsConfirmModalVisible(true)}
                  variant="primary"
                  size="lg"
                  loading={isConfirming}
                  style={styles.actionBtn}
                  leftIcon={
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  }
                />
              ) : (
                <View style={styles.confirmedStatusBox}>
                  <Ionicons name="shield-checkmark" size={18} color="#059669" />
                  <Text style={styles.confirmedStatusText}>
                    Order is confirmed ({order.state === 'done' ? 'Locked' : 'Sales Order'})
                  </Text>
                </View>
              )}
            </View>

            {/* Confirmation Dialog */}
            <QuotationConfirmModal
              visible={isConfirmModalVisible}
              order={order}
              isConfirming={isConfirming}
              serverError={error}
              onConfirm={confirmQuotation}
              onClose={() => setIsConfirmModalVisible(false)}
            />
          </>
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerRightSpacer: {
    width: 32,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 24,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  successBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
  },
  overviewCard: {
    padding: 18,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  orderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  customerName: {
    fontSize: 15,
    color: '#475569',
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaItem: {
    minWidth: '40%',
  },
  metaLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  sectionCard: {
    padding: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  linesCount: {
    fontSize: 12,
    color: '#64748B',
  },
  linesList: {
    gap: 12,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
  },
  lineDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lineMain: {
    flex: 1,
    marginRight: 12,
  },
  lineProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  lineDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  lineQuantity: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  lineSubtotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalsTable: {
    gap: 10,
    marginTop: 4,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalsLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  totalsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalsGrandRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  totalsGrandLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalsGrandValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.primary,
  },
  notesText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 16,
  },
  actionBtn: {
    width: '100%',
  },
  confirmedStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  confirmedStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
});
