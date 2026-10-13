import { Customer } from '@/types/customer';
import {
  CachedCustomerDetail,
  CachedCustomerDirectory,
  IStorageAdapter,
  PendingPhoneUpdate,
  PendingUpdateStatus,
} from '@/types/offline';
import { defaultStorageAdapter } from '../storage/storage-adapter';
import { safeLogger } from '@/lib/logger';

const PREFIX = '@odoo_sales';

export class CustomerCacheRepository {
  private storage: IStorageAdapter;

  constructor(storage: IStorageAdapter = defaultStorageAdapter) {
    this.storage = storage;
  }

  private getListKey(userKey: string): string {
    return `${PREFIX}:customers:${userKey}`;
  }

  private getDetailKey(userKey: string, id: number | string): string {
    return `${PREFIX}:customer_detail:${userKey}:${id}`;
  }

  private getPendingKey(userKey: string): string {
    return `${PREFIX}:pending_updates:${userKey}`;
  }

  /**
   * Caches customer directory list for the given authenticated user context.
   */
  async saveCustomers(userKey: string, customers: Customer[]): Promise<void> {
    try {
      const data: CachedCustomerDirectory = {
        customers,
        cachedAt: new Date().toISOString(),
        userContextKey: userKey,
      };
      await this.storage.setItem(this.getListKey(userKey), JSON.stringify(data));
      safeLogger.info(`CustomerCache: cached ${customers.length} customers for [${userKey}]`);
    } catch (err) {
      safeLogger.error('CustomerCache saveCustomers error:', err);
    }
  }

  /**
   * Retrieves cached customer list, merged with any pending local updates.
   */
  async getCachedCustomers(userKey: string): Promise<Customer[] | null> {
    try {
      const raw = await this.storage.getItem(this.getListKey(userKey));
      if (!raw) return null;

      const data: CachedCustomerDirectory = JSON.parse(raw);
      const pendingUpdates = await this.getPendingUpdates(userKey);
      const pendingMap = new Map(pendingUpdates.map((p) => [p.customerId, p]));

      // Decorate cached items with isCached and optimistic pending updates
      return data.customers.map((c) => {
        const pending = pendingMap.get(c.id);
        return {
          ...c,
          isCached: true,
          cachedAt: data.cachedAt,
          hasPendingUpdate: Boolean(pending),
          pendingPhone: pending?.newPhone,
          phone: pending ? pending.newPhone : c.phone,
        };
      });
    } catch (err) {
      safeLogger.error('CustomerCache getCachedCustomers error:', err);
      return null;
    }
  }

  /**
   * Caches an individual customer details record.
   */
  async saveCustomerDetail(userKey: string, customer: Customer): Promise<void> {
    try {
      const data: CachedCustomerDetail = {
        customer,
        cachedAt: new Date().toISOString(),
        userContextKey: userKey,
      };
      await this.storage.setItem(this.getDetailKey(userKey, customer.id), JSON.stringify(data));
    } catch (err) {
      safeLogger.error('CustomerCache saveCustomerDetail error:', err);
    }
  }

  /**
   * Retrieves cached customer detail by ID, decorated with pending updates if present.
   */
  async getCachedCustomerDetail(userKey: string, id: number | string): Promise<Customer | null> {
    try {
      const numericId = Number(id);
      const raw = await this.storage.getItem(this.getDetailKey(userKey, numericId));
      let customer: Customer | null = null;
      let cachedAt: string | undefined;

      if (raw) {
        const data: CachedCustomerDetail = JSON.parse(raw);
        customer = data.customer;
        cachedAt = data.cachedAt;
      } else {
        // Fall back to searching customer directory cache
        const directory = await this.getCachedCustomers(userKey);
        const match = directory?.find((c) => c.id === numericId);
        if (match) {
          customer = match;
          cachedAt = match.cachedAt;
        }
      }

      if (!customer) return null;

      const pendingUpdates = await this.getPendingUpdates(userKey);
      const pending = pendingUpdates.find((p) => p.customerId === numericId);

      return {
        ...customer,
        isCached: true,
        cachedAt,
        hasPendingUpdate: Boolean(pending),
        pendingPhone: pending?.newPhone,
        phone: pending ? pending.newPhone : customer.phone,
      };
    } catch (err) {
      safeLogger.error('CustomerCache getCachedCustomerDetail error:', err);
      return null;
    }
  }

  /**
   * Searches the cached customer directory by name, email, phone, or city.
   */
  async searchCachedCustomers(userKey: string, query: string): Promise<Customer[]> {
    const all = await this.getCachedCustomers(userKey);
    if (!all || all.length === 0) return [];
    if (!query || !query.trim()) return all;

    const lower = query.trim().toLowerCase();
    return all.filter((c) =>
      c.name.toLowerCase().includes(lower) ||
      c.displayName.toLowerCase().includes(lower) ||
      (c.phone && c.phone.toLowerCase().includes(lower)) ||
      (c.email && c.email.toLowerCase().includes(lower)) ||
      (c.city && c.city.toLowerCase().includes(lower))
    );
  }

  /**
   * Returns all pending phone updates queued for synchronization.
   */
  async getPendingUpdates(userKey: string): Promise<PendingPhoneUpdate[]> {
    try {
      const raw = await this.storage.getItem(this.getPendingKey(userKey));
      if (!raw) return [];
      return JSON.parse(raw) as PendingPhoneUpdate[];
    } catch (err) {
      safeLogger.error('CustomerCache getPendingUpdates error:', err);
      return [];
    }
  }

  /**
   * Enqueues or updates a pending phone edit locally.
   */
  async queuePendingUpdate(
    userKey: string,
    update: Omit<PendingPhoneUpdate, 'id' | 'queuedAt' | 'attempts' | 'status' | 'userContextKey'>
  ): Promise<PendingPhoneUpdate> {
    const list = await this.getPendingUpdates(userKey);
    // Replace existing pending update for same customer if exists
    const existingIndex = list.findIndex((u) => u.customerId === update.customerId);

    const pendingItem: PendingPhoneUpdate = {
      id: `edit_${update.customerId}_${Date.now()}`,
      customerId: update.customerId,
      customerName: update.customerName,
      originalPhone: update.originalPhone,
      newPhone: update.newPhone,
      queuedAt: new Date().toISOString(),
      attempts: 0,
      status: 'pending',
      userContextKey: userKey,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = pendingItem;
    } else {
      list.push(pendingItem);
    }

    await this.storage.setItem(this.getPendingKey(userKey), JSON.stringify(list));
    safeLogger.info(`CustomerCache: queued pending phone update for customer #${update.customerId}`);

    // Update customer in directory cache optimistically
    const cachedCustomers = await this.getCachedCustomers(userKey);
    if (cachedCustomers) {
      const idx = cachedCustomers.findIndex((c) => c.id === update.customerId);
      if (idx >= 0) {
        cachedCustomers[idx].phone = update.newPhone;
        cachedCustomers[idx].hasPendingUpdate = true;
        cachedCustomers[idx].pendingPhone = update.newPhone;
        await this.saveCustomers(userKey, cachedCustomers);
      }
    }

    return pendingItem;
  }

  /**
   * Removes a successfully synchronized pending update.
   */
  async removePendingUpdate(userKey: string, updateId: string): Promise<void> {
    const list = await this.getPendingUpdates(userKey);
    const filtered = list.filter((u) => u.id !== updateId);
    await this.storage.setItem(this.getPendingKey(userKey), JSON.stringify(filtered));
  }

  /**
   * Updates state of a pending item (e.g. mark conflict or failed attempt).
   */
  async updatePendingUpdateStatus(
    userKey: string,
    updateId: string,
    status: PendingUpdateStatus,
    errorMsg?: string
  ): Promise<void> {
    const list = await this.getPendingUpdates(userKey);
    const item = list.find((u) => u.id === updateId);
    if (item) {
      item.status = status;
      item.attempts += 1;
      if (errorMsg) {
        item.lastAttemptError = errorMsg;
      }
      await this.storage.setItem(this.getPendingKey(userKey), JSON.stringify(list));
    }
  }

  /**
   * Cleans up cached directory and detail records for a specific user session.
   * By default, preserves pending offline edits so queued changes are never silently lost.
   */
  async clearUserCache(userKey: string, preservePending = true): Promise<void> {
    try {
      const keys = await this.storage.getAllKeys();
      const userPrefix = `${PREFIX}:`;
      const toRemove = keys.filter((k) => {
        if (!k.startsWith(userPrefix) || !k.includes(`:${userKey}`)) return false;
        if (preservePending && k.includes(':pending_updates:')) return false;
        return true;
      });
      for (const k of toRemove) {
        await this.storage.removeItem(k);
      }
      safeLogger.info(`CustomerCache: cleared cached data for [${userKey}] (preserved pending: ${preservePending})`);
    } catch (err) {
      safeLogger.error('CustomerCache clearUserCache error:', err);
    }
  }
}

export const defaultCustomerCache = new CustomerCacheRepository();
