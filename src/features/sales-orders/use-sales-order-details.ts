import { useCallback, useEffect, useState } from 'react';
import { SalesOrder } from '@/types/sales-order';
import { salesOrderService } from '@/services';
import { safeLogger } from '@/lib/logger';

export function useSalesOrderDetails(orderId: string | number) {
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await salesOrderService.getSalesOrderById(orderId);
      setOrder(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sales order not found';
      safeLogger.error('Sales order fetch by id failed:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let isCancelled = false;
    Promise.resolve().then(async () => {
      if (isCancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await salesOrderService.getSalesOrderById(orderId);
        if (!isCancelled) {
          setOrder(data);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Sales order not found';
          safeLogger.error('Sales order fetch by id failed:', msg);
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
  }, [orderId]);

  const confirmQuotation = async (): Promise<boolean> => {
    setIsConfirming(true);
    setError(null);
    setConfirmSuccess(false);

    try {
      const updated = await salesOrderService.confirmQuotation(orderId);
      setOrder(updated);
      setConfirmSuccess(true);
      safeLogger.info('Successfully confirmed quotation:', updated.name);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm quotation';
      safeLogger.error('Quotation confirmation error:', msg);
      setError(msg);
      return false;
    } finally {
      setIsConfirming(false);
    }
  };

  const clearSuccess = () => setConfirmSuccess(false);

  return {
    order,
    isLoading,
    isConfirming,
    error,
    confirmSuccess,
    confirmQuotation,
    refetch: fetchOrder,
    clearSuccess,
  };
}
