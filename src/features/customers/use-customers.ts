import { useCallback, useEffect, useState } from 'react';
import { Customer } from '@/types/customer';
import {
  customerService,
  defaultCustomerCache,
  defaultSyncService,
  offlineCustomerService,
} from '@/services';
import { useNetworkStatus } from '@/services/offline/network-service';
import { safeLogger } from '@/lib/logger';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const userKey = await offlineCustomerService.getUserContextKey();
      const pending = await defaultCustomerCache.getPendingUpdates(userKey);
      setPendingCount(pending.length);
    } catch {
      // Ignore count fetch errors
    }
  }, []);

  const fetchCustomers = useCallback(async (query: string, refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await customerService.getCustomers(query);
      setCustomers(data);
      await refreshPendingCount();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load customers';
      safeLogger.error('Customer fetch failed:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [refreshPendingCount]);

  // Synchronize pending updates when connectivity returns or when user requests
  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const userKey = await offlineCustomerService.getUserContextKey();
      await defaultSyncService.syncPendingUpdates(userKey, customerService);
      await refreshPendingCount();
      await fetchCustomers(searchQuery, true);
    } catch (err) {
      safeLogger.error('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount, fetchCustomers, searchQuery]);

  // Network connectivity listener: triggers automatic background sync when connection restores
  const networkState = useNetworkStatus(useCallback(() => {
    safeLogger.info('useCustomers: connection event detected, triggering sync');
    syncNow();
  }, [syncNow]));

  // Debounced search query
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchCustomers]);

  const refresh = useCallback(() => {
    return fetchCustomers(searchQuery, true);
  }, [searchQuery, fetchCustomers]);

  const isCached = customers.length > 0 && Boolean(customers[0]?.isCached);
  const cachedAt = customers[0]?.cachedAt;
  const isOffline = !networkState.isConnected;

  return {
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
  };
}
