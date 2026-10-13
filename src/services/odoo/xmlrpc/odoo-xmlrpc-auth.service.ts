import { IAuthService, LoginCredentials, Session, User, UserRole } from '@/types/auth';
import { setAppConfig } from '@/constants/config';
import { OdooXmlRpcClient, defaultOdooXmlRpcClient, OdooXmlRpcSessionState } from './odoo-xmlrpc-client';
import { safeLogger } from '@/lib/logger';
import { validatePassword, validateUsername } from '@/lib/validation';

export class OdooXmlRpcAuthService implements IAuthService {
  private client: OdooXmlRpcClient;
  private currentSession: Session | null = null;

  constructor(client: OdooXmlRpcClient = defaultOdooXmlRpcClient) {
    this.client = client;
  }

  async login(credentials: LoginCredentials): Promise<Session> {
    safeLogger.info('OdooXmlRpcAuthService: initiating XML-RPC authentication request');

    if (credentials.serverUrl || credentials.database) {
      this.client.setConfig({
        baseUrl: credentials.serverUrl,
        database: credentials.database,
      });
      const updates: Record<string, string> = {};
      if (credentials.serverUrl) updates.odooBaseUrl = credentials.serverUrl;
      if (credentials.database) updates.odooDatabase = credentials.database;
      setAppConfig(updates);
    }

    this.client.ensureConfigured();

    const userValidation = validateUsername(credentials.username);
    if (!userValidation.isValid) {
      throw new Error(userValidation.error || 'Invalid username');
    }

    const passValidation = validatePassword(credentials.password);
    if (!passValidation.isValid) {
      throw new Error(passValidation.error || 'Invalid password');
    }

    const config = this.client.getConfig();
    const cleanUsername = credentials.username.trim();

    // Call /xmlrpc/2/common authenticate
    const authResult = await this.client.callCommon<number | boolean>('authenticate', [
      config.database,
      cleanUsername,
      credentials.password,
      {},
    ]);

    if (!authResult || typeof authResult !== 'number' || authResult <= 0) {
      safeLogger.warn('OdooXmlRpcAuthService: XML-RPC authenticate returned non-uid response');
      throw new Error('Invalid username or password. Please check your credentials.');
    }

    const uid = authResult;

    // Temporary session state to read user attributes via execute_kw
    const tempSession: OdooXmlRpcSessionState = {
      uid,
      db: config.database,
      username: cleanUsername,
      name: cleanUsername,
      passwordToken: credentials.password,
      isInternalUser: true,
      isAdmin: false,
    };
    this.client.setSession(tempSession);

    let userName = cleanUsername;
    let userEmail = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@odoo.internal`;
    let isInternal = true;
    let isAdmin = false;
    let companyName = '2S Egypt';

    try {
      const userRows = await this.client.executeKw<Record<string, unknown>[]>(
        'res.users',
        'read',
        [[uid]],
        { fields: ['name', 'login', 'email', 'company_id'] }
      );

      if (userRows && userRows.length > 0) {
        const u = userRows[0];
        if (typeof u.name === 'string') userName = u.name;
        if (typeof u.email === 'string') userEmail = u.email;
        if (Array.isArray(u.company_id) && typeof u.company_id[1] === 'string') {
          companyName = u.company_id[1];
        }
      }
    } catch (err) {
      safeLogger.warn('OdooXmlRpcAuthService: failed to read res.users details, using defaults:', err);
    }

    // Role detection via has_group
    try {
      const internalCheck = await this.client.executeKw<boolean>('res.users', 'has_group', ['base.group_user']);
      isInternal = Boolean(internalCheck);

      const systemCheck = await this.client.executeKw<boolean>('res.users', 'has_group', ['base.group_system']);
      isAdmin = Boolean(systemCheck);
    } catch {
      // Fallback: if username is admin, treat as admin sales_manager
      if (cleanUsername.toLowerCase() === 'admin') {
        isInternal = true;
        isAdmin = true;
      }
    }

    let role: UserRole = 'portal_user';
    if (isInternal) {
      role = isAdmin ? 'sales_manager' : 'sales_user';
    }

    // Final authenticated session state
    const finalSessionState: OdooXmlRpcSessionState = {
      uid,
      db: config.database,
      username: cleanUsername,
      name: userName,
      passwordToken: credentials.password,
      isInternalUser: isInternal,
      isAdmin,
    };
    this.client.setSession(finalSessionState);

    const user: User = {
      id: uid,
      name: userName,
      username: cleanUsername,
      email: userEmail,
      role,
      isInternalUser: isInternal,
      companyName,
    };

    const session: Session = {
      token: `xmlrpc_token_${uid}_${Date.now()}`,
      user,
      serverUrl: config.baseUrl,
      database: config.database,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    this.currentSession = session;
    safeLogger.info(`OdooXmlRpcAuthService: XML-RPC login successful for ${cleanUsername} [UID ${uid}, role: ${role}]`);
    return session;
  }

  async logout(): Promise<void> {
    safeLogger.info('OdooXmlRpcAuthService: logging out');
    this.client.clearSession();
    this.currentSession = null;
  }

  async getCurrentSession(): Promise<Session | null> {
    return this.currentSession;
  }
}
