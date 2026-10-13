import { APP_CONFIG } from '@/constants/config';
import { IAuthService, LoginCredentials, Session } from '@/types/auth';
import { Customer, ICustomerService } from '@/types/customer';
import { ISalesOrderService, SalesOrder } from '@/types/sales-order';

import { OdooAuthService } from './odoo/odoo-auth.service';
import { OdooCustomerService } from './odoo/odoo-customer.service';
import { OdooSalesOrderService } from './odoo/odoo-sales-order.service';
import { defaultOdooClient } from './odoo/odoo-client';

import { OdooXmlRpcAuthService } from './odoo/xmlrpc/odoo-xmlrpc-auth.service';
import { OdooXmlRpcCustomerService } from './odoo/xmlrpc/odoo-xmlrpc-customer.service';
import { OdooXmlRpcSalesOrderService } from './odoo/xmlrpc/odoo-xmlrpc-sales-order.service';
import { defaultOdooXmlRpcClient } from './odoo/xmlrpc/odoo-xmlrpc-client';

import { offlineCustomerService, OfflineCustomerService } from './offline/offline-customer.service';
import { defaultCustomerCache, CustomerCacheRepository } from './offline/customer-cache';
import { defaultSyncService, SyncService } from './offline/sync-service';

// Production JSON-RPC Service Singletons (Default)
export const odooAuth = new OdooAuthService(defaultOdooClient);
export const odooCustomers = new OdooCustomerService(defaultOdooClient);
export const odooSalesOrders = new OdooSalesOrderService(defaultOdooClient);

// Production XML-RPC Service Singletons
export const odooXmlRpcAuth = new OdooXmlRpcAuthService(defaultOdooXmlRpcClient);
export const odooXmlRpcCustomers = new OdooXmlRpcCustomerService(defaultOdooXmlRpcClient);
export const odooXmlRpcSalesOrders = new OdooXmlRpcSalesOrderService(defaultOdooXmlRpcClient);

export function getActiveAuthService(): IAuthService {
  return APP_CONFIG.transport === 'xmlrpc' ? odooXmlRpcAuth : odooAuth;
}

export function getActiveCustomerService(): ICustomerService {
  return APP_CONFIG.transport === 'xmlrpc' ? odooXmlRpcCustomers : odooCustomers;
}

export function getActiveSalesOrderService(): ISalesOrderService {
  return APP_CONFIG.transport === 'xmlrpc' ? odooXmlRpcSalesOrders : odooSalesOrders;
}

// Wire delegate and session getters into offline customer service
offlineCustomerService.setDelegate(() => getActiveCustomerService());
offlineCustomerService.setSessionGetter(() => getActiveAuthService().getCurrentSession());

/**
 * Enterprise Production Service Container.
 * Supports configurable JSON-RPC (default fallback) or XML-RPC transports.
 */
export const authService: IAuthService = {
  login: (credentials: LoginCredentials): Promise<Session> =>
    getActiveAuthService().login(credentials),
  logout: async (): Promise<void> => {
    try {
      const session = await getActiveAuthService().getCurrentSession();
      if (session && session.user) {
        const userKey = `odoo_${session.user.id}_${session.database || APP_CONFIG.odooDatabase || 'default'}`;
        await defaultCustomerCache.clearUserCache(userKey, true);
      }
    } catch {
      // Best-effort cleanup
    }
    await getActiveAuthService().logout();
  },
  getCurrentSession: (): Promise<Session | null> =>
    getActiveAuthService().getCurrentSession(),
};

/**
 * Offline-capable Customer Service.
 * Transparently manages Odoo ERP customer fetch, local caching, search,
 * and pending phone update synchronization.
 */
export const customerService: ICustomerService = {
  getCustomers: (query?: string): Promise<Customer[]> =>
    offlineCustomerService.getCustomers(query),
  getCustomerById: (id: number | string): Promise<Customer> =>
    offlineCustomerService.getCustomerById(id),
  updateCustomerPhone: (id: number | string, phone: string): Promise<Customer> =>
    offlineCustomerService.updateCustomerPhone(id, phone),
};

/**
 * Sales Order Service.
 * Connects directly to Odoo ERP sale.order model with role guards.
 */
export const salesOrderService: ISalesOrderService = {
  getSalesOrders: (): Promise<SalesOrder[]> =>
    getActiveSalesOrderService().getSalesOrders(),
  getSalesOrderById: (id: number | string): Promise<SalesOrder> =>
    getActiveSalesOrderService().getSalesOrderById(id),
  confirmQuotation: (id: number | string): Promise<SalesOrder> =>
    getActiveSalesOrderService().confirmQuotation(id),
};

export function updateServerConfig(config: { baseUrl?: string; database?: string }): void {
  defaultOdooClient.setConfig(config);
  defaultOdooXmlRpcClient.setConfig(config);
}

export function getServerConfig(): { baseUrl: string; database: string } {
  return defaultOdooClient.getConfig();
}

export {
  defaultOdooClient,
  defaultOdooXmlRpcClient,
  offlineCustomerService,
  OfflineCustomerService,
  defaultCustomerCache,
  CustomerCacheRepository,
  defaultSyncService,
  SyncService,
};
