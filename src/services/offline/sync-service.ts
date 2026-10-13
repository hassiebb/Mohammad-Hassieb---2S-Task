import { ICustomerService } from '@/types/customer';
import { SyncResult } from '@/types/offline';
import { CustomerCacheRepository, defaultCustomerCache } from './customer-cache';
import { safeLogger } from '@/lib/logger';

export type SyncEventListener = (result: SyncResult) => void;

export class SyncService {
  private cache: CustomerCacheRepository;
  private isSyncInProgress = false;
  private listeners: Set<SyncEventListener> = new Set();

  constructor(cache: CustomerCacheRepository = defaultCustomerCache) {
    this.cache = cache;
  }

  public isSyncing(): boolean {
    return this.isSyncInProgress;
  }

  public addListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(result: SyncResult): void {
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch (err) {
        safeLogger.error('SyncService listener error:', err);
      }
    }
  }

  /**
   * Synchronizes all queued pending phone updates for the specified user context.
   * Guarantees non-overlapping execution via an internal mutex lock.
   */
  async syncPendingUpdates(
    userKey: string,
    customerService: ICustomerService
  ): Promise<SyncResult> {
    if (this.isSyncInProgress) {
      safeLogger.info('SyncService: synchronization already in progress, skipping overlapping run.');
      return {
        totalProcessed: 0,
        syncedCount: 0,
        failedCount: 0,
        conflictCount: 0,
        errors: [],
      };
    }

    this.isSyncInProgress = true;
    safeLogger.info(`SyncService: starting pending updates synchronization for [${userKey}]`);

    const result: SyncResult = {
      totalProcessed: 0,
      syncedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      errors: [],
    };

    try {
      const pendingList = await this.cache.getPendingUpdates(userKey);
      if (pendingList.length === 0) {
        safeLogger.info('SyncService: no pending updates in queue.');
        return result;
      }

      for (const item of pendingList) {
        result.totalProcessed += 1;
        try {
          // 1. Fetch remote record to verify current server state & detect conflicts
          const remoteCustomer = await customerService.getCustomerById(item.customerId);

          // 2. Conflict detection:
          // If remote phone has been modified on server since it was cached,
          // and doesn't match our intended new phone:
          const remoteNormalized = (remoteCustomer.phone || '').trim();
          const origNormalized = item.originalPhone.trim();
          const newNormalized = item.newPhone.trim();

          if (
            remoteNormalized &&
            origNormalized &&
            remoteNormalized !== origNormalized &&
            remoteNormalized !== newNormalized
          ) {
            safeLogger.warn(
              `SyncService: conflict detected on customer #${item.customerId}. Remote: "${remoteNormalized}", expected original: "${origNormalized}"`
            );
            await this.cache.updatePendingUpdateStatus(
              userKey,
              item.id,
              'conflict',
              `Conflict: Remote phone was updated to "${remoteNormalized}" while offline.`
            );
            result.conflictCount += 1;
            result.errors.push({
              id: item.id,
              error: `Conflict: Remote phone number changed to "${remoteNormalized}".`,
            });
            continue;
          }

          // 3. Apply the update remotely
          const updated = await customerService.updateCustomerPhone(item.customerId, item.newPhone);

          // 4. Verify read-back
          if (updated.phone === item.newPhone) {
            await this.cache.removePendingUpdate(userKey, item.id);
            // Update cached detail with confirmed remote record
            await this.cache.saveCustomerDetail(userKey, {
              ...updated,
              hasPendingUpdate: false,
              pendingPhone: undefined,
            });

            // Update customer in directory cache
            const cachedList = await this.cache.getCachedCustomers(userKey);
            if (cachedList) {
              const idx = cachedList.findIndex((c) => c.id === item.customerId);
              if (idx >= 0) {
                cachedList[idx].phone = item.newPhone;
                cachedList[idx].hasPendingUpdate = false;
                cachedList[idx].pendingPhone = undefined;
                await this.cache.saveCustomers(userKey, cachedList);
              }
            }

            result.syncedCount += 1;
            safeLogger.info(
              `SyncService: successfully synced phone update for customer #${item.customerId} (${item.newPhone})`
            );
          } else {
            throw new Error('Read-back verification failed: remote phone does not match submitted value.');
          }
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          safeLogger.error(`SyncService: failed to sync item ${item.id}:`, errorMsg);

          result.failedCount += 1;
          result.errors.push({ id: item.id, error: errorMsg });

          await this.cache.updatePendingUpdateStatus(userKey, item.id, 'failed', errorMsg);

          // If network failure or session expired, abort rest of batch
          if (
            errorMsg.toLowerCase().includes('network') ||
            errorMsg.toLowerCase().includes('connect to odoo') ||
            errorMsg.toLowerCase().includes('expired') ||
            errorMsg.toLowerCase().includes('access denied')
          ) {
            safeLogger.warn('SyncService: halting batch sync due to connection or authentication issue.');
            break;
          }
        }
      }

      // Refresh directory cache after syncing
      const cachedCustomers = await this.cache.getCachedCustomers(userKey);
      if (cachedCustomers) {
        await this.cache.saveCustomers(userKey, cachedCustomers);
      }
    } finally {
      this.isSyncInProgress = false;
      this.notifyListeners(result);
    }

    return result;
  }
}

export const defaultSyncService = new SyncService();
