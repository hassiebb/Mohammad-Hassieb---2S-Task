import { useCallback, useEffect, useState } from 'react';
import { SalesOrder } from '@/types/sales-order';
import { salesOrderService } from '@/services';
import { safeLogger } from '@/lib/logger';

export type OrderFilter = 'all' | 'quotations' | 'orders';

export function useSalesOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await salesOrderService.getSalesOrders();
      setOrders(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load sales orders';
      safeLogger.error('Sales order fetch failed:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    Promise.resolve().then(async () => {
      if (isCancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await salesOrderService.getSalesOrders();
        if (!isCancelled) {
          setOrders(data);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load sales orders';
          safeLogger.error('Sales order fetch failed:', msg);
          setError(msg);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const refresh = useCallback(() => {
    return fetchOrders(true);
  }, [fetchOrders]);

  const filteredOrders = orders.filter((order) => {
    if (filter === 'quotations') {
      return order.state === 'draft' || order.state === 'sent';
    }
    if (filter === 'orders') {
      return order.state === 'sale' || order.state === 'done';
    }
    return true;
  });

  return {
    orders: filteredOrders,
    rawOrders: orders,
    filter,
    setFilter,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
