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
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CustomerCard } from './CustomerCard';
import { useCustomers } from './use-customers';
import { Customer } from '@/types/customer';
import { Palette } from '@/constants/colors';
import { OfflineBanner } from '@/components/OfflineBanner';

export function CustomerList() {
  const router = useRouter();
  const {
    customers,
    searchQuery,
    setSearchQuery,
    isLoading,
    isRefreshing,
    isSyncing,
    pendingCount,
    isOffline,
    isCached,
    cachedAt,
    error,
    refresh,
    syncNow,
  } = useCustomers();

  const handleCustomerPress = (customer: Customer) => {
    router.push({
      pathname: '/(app)/customer/[id]',
      params: { id: String(customer.id) },
    });
  };

  const renderItem = ({ item }: { item: Customer }) => (
    <CustomerCard customer={item} onPress={() => handleCustomerPress(item)} />
  );

  return (
    <View style={styles.container}>
      <OfflineBanner
        isOffline={isOffline}
        isCached={isCached}
        cachedAt={cachedAt}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onSyncPress={syncNow}
      />

      <View style={styles.searchHeader}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, phone, city..."
        />
        <View style={styles.resultSummary}>
          <Text style={styles.summaryText}>
            {isLoading ? 'Searching customers...' : `${customers.length} customers found`}
          </Text>
        </View>
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
        <LoadingSpinner message="Loading customer directory..." />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
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
              icon="people-outline"
              title="No Customers Found"
              description={
                searchQuery
                  ? `No matching customers for "${searchQuery}". Try a different name, city, or phone.`
                  : 'No customer records available in the directory.'
              }
              actionTitle={searchQuery ? 'Clear Search' : undefined}
              onAction={searchQuery ? () => setSearchQuery('') : undefined}
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
  searchHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  resultSummary: {
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  summaryText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
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
