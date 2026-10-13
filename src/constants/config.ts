export type OdooTransport = 'jsonrpc' | 'xmlrpc';

export interface AppConfig {
  appName: string;
  companyName: string;
  odooBaseUrl: string;
  odooDatabase: string;
  apiVersion: string;
  requestTimeoutMs: number;
  transport: OdooTransport;
}

/**
 * Normalizes Odoo base URLs by stripping trailing slashes and common web path suffixes
 * such as /odoo, /web, or /xmlrpc so routing hits root RPC endpoints correctly.
 */
export function sanitizeOdooBaseUrl(url: string): string {
  if (!url) return '';
  return url
    .trim()
    .replace(/\/+(odoo|web|xmlrpc(\/2)?)(\/.*)?$/i, '')
    .replace(/\/+$/, '');
}

/**
 * 2S Egypt Enterprise App Configuration.
 * Connects directly to the persistent company Odoo Cloud ERP instance (2s-task.odoo.com).
 */
export const APP_CONFIG: AppConfig = {
  appName: 'Sales Management',
  companyName: '2S Egypt',
  odooBaseUrl: sanitizeOdooBaseUrl(process.env.EXPO_PUBLIC_ODOO_URL || 'https://2s-task.odoo.com'),
  odooDatabase: process.env.EXPO_PUBLIC_ODOO_DB || '2s-task',
  apiVersion: '2.0',
  requestTimeoutMs: 15000,
  transport: (process.env.EXPO_PUBLIC_ODOO_TRANSPORT === 'xmlrpc' ? 'xmlrpc' : 'jsonrpc'),
};

export function setAppConfig(updates: Partial<AppConfig>): void {
  if (updates.odooBaseUrl !== undefined) {
    updates.odooBaseUrl = sanitizeOdooBaseUrl(updates.odooBaseUrl);
  }
  Object.assign(APP_CONFIG, updates);
}
