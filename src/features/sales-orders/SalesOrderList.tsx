import React from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SalesOrderCard } from './SalesOrderCard';
import { OrderFilter, useSalesOrders } from './use-sales-orders';
import { SalesOrder } from '@/types/sales-order';
import { Palette } from '@/constants/colors';

const FILTER_TABS: { key: OrderFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'quotations', label: 'Quotations' },
  { key: 'orders', label: 'Sales Orders' },
];

export function SalesOrderList() {
  const router = useRouter();
  const {
    orders,
    rawOrders,
    filter,
    setFilter,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useSalesOrders();

  const handleOrderPress = (order: SalesOrder) => {
    router.push({
      pathname: '/(app)/order/[id]',
      params: { id: String(order.id) },
    });
  };

  const renderItem = ({ item }: { item: SalesOrder }) => (
    <SalesOrderCard order={item} onPress={() => handleOrderPress(item)} />
  );

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.tabsHeader}>
        <View style={styles.tabsRow}>
          {FILTER_TABS.map((tab) => {
            const isSelected = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${tab.label}`}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}>
                <Text
                  style={[
                    styles.tabButtonText,
                    isSelected && styles.tabButtonTextActive,
                  ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.countText}>
          {orders.length} of {rawOrders.length} orders
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#DC2626" />
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <Pressable onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading && !isRefreshing ? (
        <LoadingSpinner message="Loading sales orders..." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              colors={[Palette.primary]}
              tintColor={Palette.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No Sales Orders Found"
              description={
                filter === 'all'
                  ? 'There are currently no sales orders or quotations in the system.'
                  : `There are no orders matching the "${filter}" filter.`
              }
              actionTitle={filter !== 'all' ? 'View All Orders' : undefined}
              onAction={filter !== 'all' ? () => setFilter('all') : undefined}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabsHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: Palette.primary,
  },
  countText: {
    fontSize: 12,
    color: '#94A3B8',
    paddingHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#DC2626',
    borderRadius: 6,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
