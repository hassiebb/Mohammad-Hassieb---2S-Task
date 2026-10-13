import { Customer } from './customer';

export interface IStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}

export type PendingUpdateStatus = 'pending' | 'syncing' | 'failed' | 'conflict';

export interface PendingPhoneUpdate {
  id: string;
  customerId: number;
  customerName: string;
  originalPhone: string;
  newPhone: string;
  queuedAt: string;
  attempts: number;
  lastAttemptError?: string;
  status: PendingUpdateStatus;
  userContextKey: string;
}

export interface CachedCustomerDirectory {
  customers: Customer[];
  cachedAt: string;
  userContextKey: string;
}

export interface CachedCustomerDetail {
  customer: Customer;
  cachedAt: string;
  userContextKey: string;
}

export interface SyncResult {
  totalProcessed: number;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  errors: { id: string; error: string }[];
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOdooReachable: boolean | null;
}
