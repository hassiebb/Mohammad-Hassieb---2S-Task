import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SalesOrder } from '@/types/sales-order';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/colors';

export interface SalesOrderCardProps {
  order: SalesOrder;
  onPress: () => void;
}

export function SalesOrderCard({ order, onPress }: SalesOrderCardProps) {
  return (
    <Card onPress={onPress} elevated style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.orderNumberRow}>
          <View style={styles.iconBadge}>
            <Ionicons name="document-text-outline" size={16} color={Palette.primary} />
          </View>
          <Text style={styles.orderNumber}>{order.name}</Text>
        </View>

        <Badge status={order.state} label="" />
      </View>

      <Text style={styles.customerName} numberOfLines={1}>
        {order.customerName}
      </Text>

      <View style={styles.footerRow}>
        <View style={styles.dateCol}>
          <Ionicons name="calendar-outline" size={13} color="#64748B" />
          <Text style={styles.dateText}>{formatDate(order.dateOrder)}</Text>
        </View>

        <Text style={styles.totalAmount}>
          {formatCurrency(order.amountTotal, order.currencySymbol)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 13,
    color: '#64748B',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
});
