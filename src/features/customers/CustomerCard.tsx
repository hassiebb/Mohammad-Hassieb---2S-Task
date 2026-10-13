import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Customer } from '@/types/customer';
import { Card } from '@/components/Card';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '@/constants/colors';

export interface CustomerCardProps {
  customer: Customer;
  onPress: () => void;
}

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const initials = customer.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Card onPress={onPress} elevated style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.customerName} numberOfLines={1}>
              {customer.name}
            </Text>
            {customer.isCompany && (
              <View style={styles.companyBadge}>
                <Ionicons name="business-outline" size={12} color="#64748B" />
                <Text style={styles.companyText}>Company</Text>
              </View>
            )}
          </View>

          {customer.displayName && customer.displayName !== customer.name && (
            <Text style={styles.displayName} numberOfLines={1}>
              {customer.displayName}
            </Text>
          )}

          {customer.hasPendingUpdate && (
            <View style={styles.pendingBadge}>
              <Ionicons name="cloud-upload" size={11} color="#D97706" />
              <Text style={styles.pendingText}>Pending Sync</Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>

      <View style={styles.detailsRow}>
        {Boolean(customer.phone) && (
          <View style={[styles.detailItem, customer.hasPendingUpdate && styles.pendingDetailItem]}>
            <Ionicons
              name={customer.hasPendingUpdate ? 'cloud-upload-outline' : 'call-outline'}
              size={13}
              color={customer.hasPendingUpdate ? '#D97706' : '#64748B'}
            />
            <Text style={[styles.detailText, customer.hasPendingUpdate && styles.pendingPhoneText]}>
              {customer.phone}
            </Text>
          </View>
        )}

        {Boolean(customer.city) && (
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={13} color="#64748B" />
            <Text style={styles.detailText}>{customer.city}</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.primary,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  companyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  displayName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  pendingDetailItem: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingPhoneText: {
    color: '#B45309',
    fontWeight: '600',
  },
});
