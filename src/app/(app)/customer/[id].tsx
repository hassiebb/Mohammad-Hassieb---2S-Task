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
import { useCustomerDetails } from '@/features/customers/use-customer-details';
import { CustomerPhoneModal } from '@/features/customers/CustomerPhoneModal';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Palette } from '@/constants/colors';
import { formatCurrency } from '@/lib/formatters';

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    customer,
    isLoading,
    isSaving,
    error,
    saveSuccess,
    updatePhone,
    clearSuccess,
  } = useCustomerDetails(id || '');

  const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingSpinner message="Loading customer details..." />
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          icon="alert-circle-outline"
          title="Customer Not Found"
          description={error || `Could not find customer with ID: ${id}`}
          actionTitle="Back to Directory"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const initials = customer.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const fullAddress = [
    customer.street,
    customer.city,
    customer.state,
    customer.zip,
    customer.country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Back to customer list"
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Customer Details</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Banner */}
        {saveSuccess && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#065F46" />
            <Text style={styles.successBannerText}>
              {customer.hasPendingUpdate
                ? 'Phone number saved locally in pending sync queue!'
                : 'Phone number updated successfully!'}
            </Text>
            <Pressable onPress={clearSuccess} hitSlop={6}>
              <Ionicons name="close" size={16} color="#065F46" />
            </Pressable>
          </View>
        )}

        {/* Pending Sync Notice */}
        {customer.hasPendingUpdate && (
          <View style={styles.pendingBanner}>
            <Ionicons name="cloud-upload" size={20} color="#92400E" />
            <View style={styles.pendingBannerContent}>
              <Text style={styles.pendingBannerTitle}>Pending Offline Sync</Text>
              <Text style={styles.pendingBannerSubtitle}>
                Updated phone ({customer.phone}) is saved locally. It will automatically sync to Odoo when online.
              </Text>
            </View>
          </View>
        )}

        {/* Cached / Offline Data Notice */}
        {customer.isCached && !customer.hasPendingUpdate && (
          <View style={styles.cachedBadge}>
            <Ionicons name="archive-outline" size={15} color="#64748B" />
            <Text style={styles.cachedBadgeText}>
              Offline Cached Record {customer.cachedAt ? `(saved ${new Date(customer.cachedAt).toLocaleDateString()})` : ''}
            </Text>
          </View>
        )}

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Profile Card */}
        <Card elevated style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileCol}>
              <Text style={styles.name}>{customer.name}</Text>
              {customer.displayName && customer.displayName !== customer.name && (
                <Text style={styles.displayName}>{customer.displayName}</Text>
              )}
              <View style={styles.typeBadge}>
                <Ionicons
                  name={customer.isCompany ? 'business' : 'person'}
                  size={12}
                  color="#64748B"
                />
                <Text style={styles.typeBadgeText}>
                  {customer.isCompany ? 'Company' : 'Individual'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Contact Information Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          {/* Editable Phone Field */}
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="call-outline" size={18} color={Palette.primary} />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>
                  {customer.phone || 'No phone number set'}
                </Text>
              </View>
            </View>
            <Button
              title="Edit"
              onPress={() => setIsPhoneModalVisible(true)}
              variant="outline"
              size="sm"
              leftIcon={<Ionicons name="pencil-outline" size={13} color={Palette.primary} />}
            />
          </View>

          {Boolean(customer.mobile) && (
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <View style={styles.infoIconCircle}>
                  <Ionicons name="phone-portrait-outline" size={18} color={Palette.primary} />
                </View>
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>Mobile</Text>
                  <Text style={styles.infoValue}>{customer.mobile}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Email */}
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="mail-outline" size={18} color={Palette.primary} />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{customer.email || '—'}</Text>
              </View>
            </View>
          </View>

          {/* Address */}
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="location-outline" size={18} color={Palette.primary} />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{fullAddress || 'No address registered'}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Business Overview Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Sales Summary</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Orders</Text>
              <Text style={styles.metricValue}>{customer.totalOrders ?? 0}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Invoiced</Text>
              <Text style={styles.metricValue}>
                {formatCurrency(customer.totalInvoiced ?? 0)}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Phone Edit Modal */}
      <CustomerPhoneModal
        visible={isPhoneModalVisible}
        currentPhone={customer.phone || ''}
        customerName={customer.name}
        isSaving={isSaving}
        serverError={error}
        onSave={updatePhone}
        onClose={() => setIsPhoneModalVisible(false)}
      />
    </SafeAreaView>
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
    paddingBottom: 40,
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
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  pendingBannerContent: {
    flex: 1,
  },
  pendingBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  pendingBannerSubtitle: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    alignSelf: 'flex-start',
  },
  cachedBadgeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  profileCard: {
    padding: 18,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.primary,
  },
  profileCol: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  displayName: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginTop: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  sectionCard: {
    padding: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTexts: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.primary,
    marginTop: 4,
  },
});
