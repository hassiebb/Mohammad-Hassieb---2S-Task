import { APP_CONFIG, sanitizeOdooBaseUrl } from '@/constants/config';
import { safeLogger } from '@/lib/logger';

export interface OdooClientConfig {
  baseUrl: string;
  database: string;
  timeoutMs?: number;
}

export class OdooNotConfiguredError extends Error {
  constructor(message = 'Odoo server URL and database are not configured.') {
    super(message);
    this.name = 'OdooNotConfiguredError';
  }
}

export class OdooRpcError extends Error {
  public code?: number;
  public odooErrorName?: string;
  public details?: unknown;

  constructor(message: string, code?: number, odooErrorName?: string, details?: unknown) {
    super(message);
    this.name = 'OdooRpcError';
    this.code = code;
    this.odooErrorName = odooErrorName;
    this.details = details;
  }
}

export interface OdooSessionState {
  uid: number;
  sessionId: string;
  cookieHeader: string;
  name: string;
  username: string;
  isInternalUser: boolean;
  isAdmin: boolean;
  userContext?: Record<string, unknown>;
}

/**
 * Real Odoo API Client Boundary.
 *
 * Communicates with Odoo instances using JSON-RPC 2.0:
 * - Session handshake: POST /web/session/authenticate
 * - Object operations: POST /web/dataset/call_kw
 * - Version verification: POST /web/webclient/version_info
 *
 * Maintains strict isolation: NEVER silently falls back to mock data.
 */
function parseCookiesFromHeader(header: string | null | undefined): string {
  if (!header) return '';
  const cookiePairs: string[] = [];
  const parts = header.split(/,(?=[^;]*=)/);
  for (const part of parts) {
    const main = part.split(';')[0]?.trim();
    if (main && main.includes('=')) {
      cookiePairs.push(main);
    }
  }
  return cookiePairs.join('; ');
}

export class OdooClient {
  private config: OdooClientConfig;
  private sessionState: OdooSessionState | null = null;
  private sessionCookie: string = '';

  constructor(config?: Partial<OdooClientConfig>) {
    this.config = {
      baseUrl: sanitizeOdooBaseUrl(config?.baseUrl !== undefined ? config.baseUrl : APP_CONFIG.odooBaseUrl),
      database: config?.database !== undefined ? config.database : APP_CONFIG.odooDatabase,
      timeoutMs: config?.timeoutMs || APP_CONFIG.requestTimeoutMs,
    };
  }

  public setConfig(newConfig: Partial<OdooClientConfig>): void {
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

  public getConfig(): OdooClientConfig {
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
      safeLogger.error('OdooClient: attempt to invoke real Odoo API without server configuration');
      throw new OdooNotConfiguredError(
        'Odoo instance is not configured. Please supply EXPO_PUBLIC_ODOO_URL and EXPO_PUBLIC_ODOO_DB in your environment configuration.'
      );
    }
  }

  public setSession(session: OdooSessionState): void {
    this.sessionState = session;
    if (session.cookieHeader) {
      this.sessionCookie = parseCookiesFromHeader(session.cookieHeader);
    }
  }

  public clearSession(): void {
    this.sessionState = null;
    this.sessionCookie = '';
  }

  public getSession(): OdooSessionState | null {
    return this.sessionState;
  }

  public isInternalUser(): boolean {
    if (!this.sessionState) return false;
    return this.sessionState.isInternalUser;
  }

  /**
   * Executes a low-level JSON-RPC call against the configured Odoo endpoint.
   */
  public async callJsonRpc<T>(endpoint: string, params: Record<string, unknown>): Promise<T> {
    this.ensureConfigured();
    const activeConfig = this.getConfig();

    const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${activeConfig.baseUrl}${normalizedPath}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }

    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params,
      id: Math.floor(Math.random() * 1000000),
    };

    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs || 15000);

      response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (err: unknown) {
      if (err instanceof OdooRpcError) {
        throw err;
      }
      const errorMsg = err instanceof Error ? err.message : String(err);
      safeLogger.error(`OdooClient network error invoking ${normalizedPath}:`, errorMsg);
      throw new Error(
        'Unable to connect to Odoo server. Please check your network connection and server status.'
      );
    }

    // Capture updated session cookie if present
    const rawSetCookie = typeof (response.headers as any).getSetCookie === 'function'
      ? (response.headers as any).getSetCookie().join('; ')
      : response.headers.get('set-cookie');

    if (rawSetCookie) {
      const parsed = parseCookiesFromHeader(rawSetCookie);
      if (parsed) {
        this.sessionCookie = parsed;
        if (this.sessionState) {
          this.sessionState.cookieHeader = parsed;
        }
      }
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        throw new OdooRpcError(
          'Your Odoo session has expired or is invalid. Please sign in again.',
          response.status,
          'SessionExpired'
        );
      }
      throw new Error(`Invalid JSON response received from Odoo server at ${url} (HTTP ${response.status})`);
    }

    if (data.error) {
      const odooErr = data.error;
      const errorName = odooErr.data?.name || '';
      const errorMessage = odooErr.data?.message || odooErr.message || 'Odoo Server Error';

      safeLogger.warn(`OdooClient RPC error from ${normalizedPath}: [${errorName}] ${errorMessage}`);

      if (errorName.includes('AccessDenied') || errorMessage.toLowerCase().includes('access denied')) {
        throw new OdooRpcError(
          'Invalid username or password. Please check your credentials.',
          odooErr.code,
          errorName,
          odooErr.data
        );
      }

      if (errorName.includes('AccessError')) {
        throw new OdooRpcError(
          `Access Denied: ${errorMessage}`,
          odooErr.code,
          errorName,
          odooErr.data
        );
      }

      if (
        errorName.includes('OperationalError') ||
        (errorMessage.toLowerCase().includes('database') && errorMessage.toLowerCase().includes('does not exist')) ||
        errorMessage.toLowerCase().includes('could not connect to server') ||
        errorMessage.toLowerCase().includes('connection to server')
      ) {
        throw new OdooRpcError(
          'The configured Odoo service is currently unavailable or undergoing maintenance. Please tap Retry to try again.',
          odooErr.code,
          'ServiceUnavailable',
          odooErr.data
        );
      }

      throw new OdooRpcError(errorMessage, odooErr.code, errorName, odooErr.data);
    }

    return data.result as T;
  }

  /**
   * Executes a model method via Odoo's standard call_kw gateway.
   */
  public async callKw<T>(
    model: string,
    method: string,
    args: unknown[],
    kwargs: Record<string, unknown> = {}
  ): Promise<T> {
    return this.callJsonRpc<T>('/web/dataset/call_kw', {
      model,
      method,
      args,
      kwargs,
    });
  }
}

export const defaultOdooClient = new OdooClient();
