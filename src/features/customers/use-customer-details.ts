import { useCallback, useEffect, useState } from 'react';
import { Customer } from '@/types/customer';
import { customerService } from '@/services';
import { safeLogger } from '@/lib/logger';
import { validatePhoneNumber } from '@/lib/validation';

export function useCustomerDetails(customerId: string | number) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await customerService.getCustomerById(customerId);
      setCustomer(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Customer not found';
      safeLogger.error('Customer fetch by id failed:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    let isCancelled = false;
    Promise.resolve().then(async () => {
      if (isCancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await customerService.getCustomerById(customerId);
        if (!isCancelled) {
          setCustomer(data);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Customer not found';
          safeLogger.error('Customer fetch by id failed:', msg);
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
  }, [customerId]);

  const updatePhone = async (newPhone: string): Promise<boolean> => {
    const validation = validatePhoneNumber(newPhone);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid phone number');
      return false;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const updated = await customerService.updateCustomerPhone(customerId, newPhone);
      setCustomer(updated);
      setSaveSuccess(true);
      safeLogger.info('Successfully updated customer phone:', newPhone);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update phone number';
      safeLogger.error('Customer phone update error:', msg);
      setError(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const clearSuccess = () => setSaveSuccess(false);

  return {
    customer,
    isLoading,
    isSaving,
    error,
    saveSuccess,
    updatePhone,
    refetch: fetchCustomer,
    clearSuccess,
  };
}
