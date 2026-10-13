import { Customer, ICustomerService } from '@/types/customer';
import { CustomerCacheRepository, defaultCustomerCache } from './customer-cache';
import { Session } from '@/types/auth';
import { APP_CONFIG } from '@/constants/config';
import { safeLogger } from '@/lib/logger';
import { validatePhoneNumber } from '@/lib/validation';

export class OfflineCustomerService implements ICustomerService {
  private cache: CustomerCacheRepository;
  private delegateServiceGetter?: () => ICustomerService;
  private sessionGetter?: () => Promise<Session | null>;

  constructor(
    cache: CustomerCacheRepository = defaultCustomerCache,
    delegateServiceGetter?: () => ICustomerService,
    sessionGetter?: () => Promise<Session | null>
  ) {
    this.cache = cache;
    this.delegateServiceGetter = delegateServiceGetter;
    this.sessionGetter = sessionGetter;
  }

  public setDelegate(delegateGetter: () => ICustomerService): void {
    this.delegateServiceGetter = delegateGetter;
  }

  public setSessionGetter(sessionGetter: () => Promise<Session | null>): void {
    this.sessionGetter = sessionGetter;
  }

  public async getUserContextKey(): Promise<string> {
    try {
      if (this.sessionGetter) {
        const session = await this.sessionGetter();
        if (session && session.user) {
          const db = session.database || APP_CONFIG.odooDatabase || 'default';
          return `odoo_${session.user.id}_${db}`;
        }
      }
    } catch {
      // Ignore session fetch error
    }
    const db = APP_CONFIG.odooDatabase || 'default';
    return `odoo_default_user_${db}`;
  }

  async getCustomers(query?: string): Promise<Customer[]> {
    const userKey = await this.getUserContextKey();
    if (!this.delegateServiceGetter) {
      throw new Error('OfflineCustomerService: No delegate service configured.');
    }
    const activeService = this.delegateServiceGetter();

    try {
      // 1. Attempt online fetch first
      const onlineCustomers = await activeService.getCustomers(query);

      // Save directory to offline cache only if this was an unfiltered query
      if (!query || !query.trim()) {
        await this.cache.saveCustomers(userKey, onlineCustomers);
      }

      // Merge with any pending offline updates
      const pendingUpdates = await this.cache.getPendingUpdates(userKey);
      if (pendingUpdates.length > 0) {
        const pendingMap = new Map(pendingUpdates.map((p) => [p.customerId, p]));
        return onlineCustomers.map((c) => {
          const pending = pendingMap.get(c.id);
          if (pending) {
            return {
              ...c,
              hasPendingUpdate: true,
              pendingPhone: pending.newPhone,
              phone: pending.newPhone,
            };
          }
          return c;
        });
      }

      return onlineCustomers;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      safeLogger.warn('OfflineCustomerService: online customer fetch failed, checking offline cache:', errorMsg);

      // 2. Fall back to cached customer directory
      const cached = query && query.trim()
        ? await this.cache.searchCachedCustomers(userKey, query)
        : await this.cache.getCachedCustomers(userKey);

      if (cached && cached.length > 0) {
        safeLogger.info(`OfflineCustomerService: returning ${cached.length} cached customers offline.`);
        return cached;
      }

      // 3. First launch with no connectivity and no cached data
      throw new Error(
        'Offline: No cached customer directory available. Please connect to the internet to load customer records.'
      );
    }
  }

  async getCustomerById(id: number | string): Promise<Customer> {
    const numericId = Number(id);
    const userKey = await this.getUserContextKey();

    if (this.delegateServiceGetter) {
      try {
        const activeService = this.delegateServiceGetter();
        const customer = await activeService.getCustomerById(numericId);
        await this.cache.saveCustomerDetail(userKey, customer);

        const pendingUpdates = await this.cache.getPendingUpdates(userKey);
        const pending = pendingUpdates.find((p) => p.customerId === numericId);
        if (pending) {
          return {
            ...customer,
            hasPendingUpdate: true,
            pendingPhone: pending.newPhone,
            phone: pending.newPhone,
          };
        }
        return {
          ...customer,
          hasPendingUpdate: false,
        };
      } catch (err: unknown) {
        safeLogger.warn(`OfflineCustomerService: online detail fetch failed for #${numericId}, checking cache:`, err);
      }
    }

    // Fall back to offline cache
    const cached = await this.cache.getCachedCustomerDetail(userKey, numericId);
    if (cached) {
      return cached;
    }

    throw new Error(
      `Customer #${id} is not available in offline cache. Connect to the internet to view complete details.`
    );
  }

  async updateCustomerPhone(id: number | string, newPhone: string): Promise<Customer> {
    const numericId = Number(id);
    const validation = validatePhoneNumber(newPhone);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid phone number format');
    }

    const userKey = await this.getUserContextKey();

    // Get current customer record to record original phone number
    let currentCustomer: Customer | null = null;
    try {
      currentCustomer = await this.getCustomerById(numericId);
    } catch {
      // May fail if not in cache
    }

    const originalPhone = currentCustomer?.phone || '';
    const customerName = currentCustomer?.name || `Customer #${id}`;

    if (this.delegateServiceGetter) {
      try {
        const activeService = this.delegateServiceGetter();
        const updated = await activeService.updateCustomerPhone(numericId, newPhone);
        await this.cache.saveCustomerDetail(userKey, {
          ...updated,
          hasPendingUpdate: false,
          pendingPhone: undefined,
          isCached: false,
        });

        // Synchronously update directory cache so list views reflect confirmed value immediately
        const cachedList = await this.cache.getCachedCustomers(userKey);
        if (cachedList) {
          const idx = cachedList.findIndex((c) => c.id === numericId);
          if (idx >= 0) {
            cachedList[idx] = {
              ...cachedList[idx],
              phone: updated.phone,
              hasPendingUpdate: false,
              pendingPhone: undefined,
            };
            await this.cache.saveCustomers(userKey, cachedList);
          }
        }

        return updated;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        safeLogger.warn(
          `OfflineCustomerService: online phone update failed for #${numericId}. Queueing offline edit:`,
          errorMsg
        );
      }
    }

      // 2. Queue offline edit locally
      await this.cache.queuePendingUpdate(userKey, {
        customerId: numericId,
        customerName,
        originalPhone,
        newPhone,
      });

      // Construct optimistic customer response
      const optimisticCustomer: Customer = {
        ...(currentCustomer || {
          id: numericId,
          name: customerName,
          displayName: customerName,
          email: '',
          phone: newPhone,
          city: '',
          isCompany: false,
        }),
        phone: newPhone,
        hasPendingUpdate: true,
        pendingPhone: newPhone,
        isCached: true,
      };

      await this.cache.saveCustomerDetail(userKey, optimisticCustomer);
      return optimisticCustomer;
  }
}

export const offlineCustomerService = new OfflineCustomerService();
