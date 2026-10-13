import { APP_CONFIG, sanitizeOdooBaseUrl } from '@/constants/config';
import { safeLogger } from '@/lib/logger';
import {
  OdooXmlRpcFaultError,
  serializeXmlRpcMethodCall,
  deserializeXmlRpcResponse,
} from './xmlrpc-serializer';

export interface OdooXmlRpcClientConfig {
  baseUrl: string;
  database: string;
  timeoutMs?: number;
}

export interface OdooXmlRpcSessionState {
  uid: number;
  db: string;
  username: string;
  name: string;
  passwordToken: string; // Ephemeral in-memory credential required for stateless execute_kw
  isInternalUser: boolean;
  isAdmin: boolean;
}

export class OdooXmlRpcNotConfiguredError extends Error {
  constructor(message = 'Odoo server URL and database are not configured for XML-RPC.') {
    super(message);
    this.name = 'OdooXmlRpcNotConfiguredError';
  }
}

export class OdooXmlRpcClient {
  private config: OdooXmlRpcClientConfig;
  private sessionState: OdooXmlRpcSessionState | null = null;

  constructor(config?: Partial<OdooXmlRpcClientConfig>) {
    this.config = {
      baseUrl: sanitizeOdooBaseUrl(config?.baseUrl !== undefined ? config.baseUrl : APP_CONFIG.odooBaseUrl),
      database: config?.database !== undefined ? config.database : APP_CONFIG.odooDatabase,
      timeoutMs: config?.timeoutMs || APP_CONFIG.requestTimeoutMs,
    };
  }

  public setConfig(newConfig: Partial<OdooXmlRpcClientConfig>): void {
    if (newConfig.baseUrl !== undefined) {
      this.config.baseUrl = sanitizeOdooBaseUrl(newConfig.baseUrl);
    }
    if (newConfig.database !== undefined) {
      this.config.database = newConfig.database;
    }
    if (newConfig.timeoutMs !== undefined) {
      this.config.timeoutMs = newConfig.timeoutMs;
    }
  }

  public getConfig(): OdooXmlRpcClientConfig {
    return {
      baseUrl: sanitizeOdooBaseUrl(this.config.baseUrl !== undefined ? this.config.baseUrl : (APP_CONFIG.odooBaseUrl || '')),
      database: this.config.database !== undefined ? this.config.database : (APP_CONFIG.odooDatabase || ''),
      timeoutMs: this.config.timeoutMs || APP_CONFIG.requestTimeoutMs,
    };
  }

  public isConfigured(): boolean {
    const cfg = this.getConfig();
    return Boolean(cfg.baseUrl && cfg.database);
  }

  public ensureConfigured(): void {
    if (!this.isConfigured()) {
      safeLogger.error('OdooXmlRpcClient: attempt to invoke XML-RPC without server configuration');
      throw new OdooXmlRpcNotConfiguredError(
        'Odoo instance is not configured. Please supply EXPO_PUBLIC_ODOO_URL and EXPO_PUBLIC_ODOO_DB in your environment configuration.'
      );
    }
  }

  public setSession(session: OdooXmlRpcSessionState): void {
    this.sessionState = session;
  }

  public clearSession(): void {
    this.sessionState = null;
  }

  public getSession(): OdooXmlRpcSessionState | null {
    return this.sessionState;
  }

  public isInternalUser(): boolean {
    if (!this.sessionState) return false;
    return this.sessionState.isInternalUser;
  }

  /**
   * Dispatches an XML-RPC HTTP POST request against a relative service path.
   */
  public async callXmlRpc<T>(endpoint: '/xmlrpc/2/common' | '/xmlrpc/2/object', methodName: string, params: unknown[]): Promise<T> {
    this.ensureConfigured();
    const activeConfig = this.getConfig();
    const url = `${activeConfig.baseUrl}${endpoint}`;

    const xmlBody = serializeXmlRpcMethodCall(methodName, params);

    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs || 15000);

      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Accept': 'text/xml',
        },
        body: xmlBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      safeLogger.error(`OdooXmlRpcClient network error invoking ${endpoint}/${methodName}:`, errorMsg);
      throw new Error(
        'Unable to connect to Odoo server via XML-RPC. Please check your network connection and server status.'
      );
    }

    if (response.status === 404) {
      throw new Error(
        'The configured Odoo server does not expose the official /xmlrpc/2 gateway. Please verify that XML-RPC access is enabled on the server.'
      );
    }

    const responseText = await response.text();

    try {
      return deserializeXmlRpcResponse<T>(responseText);
    } catch (err: unknown) {
      if (err instanceof OdooXmlRpcFaultError) {
        const faultStr = err.faultString || '';
        safeLogger.warn(`OdooXmlRpcClient fault [${err.faultCode}] from ${methodName}:`, faultStr);

        if (faultStr.toLowerCase().includes('accessdenied') || faultStr.toLowerCase().includes('access denied')) {
          throw new Error('Invalid username or password. Please check your credentials.');
        }

        if (faultStr.toLowerCase().includes('accesserror')) {
          throw new Error(`Access Denied: ${faultStr}`);
        }

        if (
          faultStr.toLowerCase().includes('database') && faultStr.toLowerCase().includes('does not exist') ||
          faultStr.toLowerCase().includes('operationalerror')
        ) {
          throw new Error(
            'The configured Odoo service is currently unavailable or undergoing maintenance. Please tap Retry to try again.'
          );
        }

        throw new Error(faultStr);
      }
      throw err;
    }
  }

  /**
   * Invokes /xmlrpc/2/common (e.g. authenticate, version)
   */
  public async callCommon<T>(methodName: string, params: unknown[]): Promise<T> {
    return this.callXmlRpc<T>('/xmlrpc/2/common', methodName, params);
  }

  /**
   * Invokes /xmlrpc/2/object execute_kw using the active in-memory session.
   */
  public async executeKw<T>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {}
  ): Promise<T> {
    if (!this.sessionState) {
      throw new Error('Your Odoo session has expired or is invalid. Please sign in again.');
    }

    const params = [
      this.sessionState.db,
      this.sessionState.uid,
      this.sessionState.passwordToken,
      model,
      method,
      args,
      kwargs,
    ];

    return this.callXmlRpc<T>('/xmlrpc/2/object', 'execute_kw', params);
  }
}

export const defaultOdooXmlRpcClient = new OdooXmlRpcClient();
