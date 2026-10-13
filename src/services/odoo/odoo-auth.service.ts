import { IAuthService, LoginCredentials, Session, User, UserRole } from '@/types/auth';
import { setAppConfig } from '@/constants/config';
import { OdooClient, defaultOdooClient, OdooSessionState } from './odoo-client';
import { safeLogger } from '@/lib/logger';
import { validatePassword, validateUsername } from '@/lib/validation';

export interface OdooAuthResult {
  uid: number;
  name: string;
  username: string;
  is_internal_user?: boolean;
  is_system?: boolean;
  is_admin?: boolean;
  partner_id?: number;
  user_context?: Record<string, unknown>;
  user_companies?: {
    current_company?: {
      name?: string;
    };
  };
}

/**
 * Real Odoo Authentication Adapter implementing IAuthService.
 * Authenticates against /web/session/authenticate using JSON-RPC.
 */
export class OdooAuthService implements IAuthService {
  private odooClient: OdooClient;
  private currentSession: Session | null = null;

  constructor(odooClient: OdooClient = defaultOdooClient) {
    this.odooClient = odooClient;
  }

  async login(credentials: LoginCredentials): Promise<Session> {
    safeLogger.info('OdooAuthService: initiating authentication request');

    // Dynamically apply credentials server/database if explicitly provided
    if (credentials.serverUrl || credentials.database) {
      this.odooClient.setConfig({
        baseUrl: credentials.serverUrl,
        database: credentials.database,
      });
      const updates: Record<string, string> = {};
      if (credentials.serverUrl) updates.odooBaseUrl = credentials.serverUrl;
      if (credentials.database) updates.odooDatabase = credentials.database;
      setAppConfig(updates);
    }

    // Ensure Odoo configuration exists before attempting call
    this.odooClient.ensureConfigured();

    const userValidation = validateUsername(credentials.username);
    if (!userValidation.isValid) {
      throw new Error(userValidation.error || 'Invalid username');
    }

    const passValidation = validatePassword(credentials.password);
    if (!passValidation.isValid) {
      throw new Error(passValidation.error || 'Invalid password');
    }

    const config = this.odooClient.getConfig();

    const authResult = await this.odooClient.callJsonRpc<OdooAuthResult>(
      '/web/session/authenticate',
      {
        db: config.database,
        login: credentials.username.trim(),
        password: credentials.password,
      }
    );

    if (!authResult || !authResult.uid) {
      throw new Error('Authentication failed: Odoo server did not return a valid user identity.');
    }

    const isInternal = Boolean(authResult.is_internal_user);
    const isAdmin = Boolean(authResult.is_system || authResult.is_admin);

    let role: UserRole = 'portal_user';
    if (isInternal) {
      role = isAdmin ? 'sales_manager' : 'sales_user';
    }

    const sessionState: OdooSessionState = {
      uid: authResult.uid,
      sessionId: `session_${authResult.uid}_${Date.now()}`,
      cookieHeader: '',
      name: authResult.name || credentials.username.trim(),
      username: credentials.username.trim(),
      isInternalUser: isInternal,
      isAdmin,
      userContext: authResult.user_context,
    };

    this.odooClient.setSession(sessionState);

    const userEmail =
      credentials.username.includes('@')
        ? credentials.username
        : `${credentials.username}@odoo.internal`;

    const user: User = {
      id: authResult.uid,
      name: authResult.name || credentials.username.trim(),
      username: credentials.username.trim(),
      email: userEmail,
      role,
      isInternalUser: isInternal,
      companyName: authResult.user_companies?.current_company?.name || '2S Egypt',
    };

    const session: Session = {
      token: sessionState.sessionId,
      user,
      serverUrl: config.baseUrl,
      database: config.database,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    this.currentSession = session;
    safeLogger.info('OdooAuthService: login successful for user:', user.username, 'role:', role);
    return session;
  }

  async logout(): Promise<void> {
    safeLogger.info('OdooAuthService: logging out session');
    try {
      if (this.odooClient.isConfigured() && this.currentSession) {
        await this.odooClient.callJsonRpc('/web/session/destroy', {});
      }
    } catch {
      // Best-effort remote session revocation
    } finally {
      this.currentSession = null;
      this.odooClient.clearSession();
    }
  }

  async getCurrentSession(): Promise<Session | null> {
    return this.currentSession;
  }
}
