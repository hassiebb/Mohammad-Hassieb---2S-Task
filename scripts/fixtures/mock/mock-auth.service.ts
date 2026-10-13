import { IAuthService, LoginCredentials, Session, User } from '@/types/auth';
import { INITIAL_MOCK_USERS } from './mock-data';
import { safeLogger } from '@/lib/logger';

export class MockAuthService implements IAuthService {
  private activeSession: Session | null = null;

  async login(credentials: LoginCredentials): Promise<Session> {
    safeLogger.info('MockAuthService: attempting login for user:', credentials.username);

    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 450));

    const matchedUser = INITIAL_MOCK_USERS.find(
      (u) =>
        u.username.toLowerCase() === credentials.username.trim().toLowerCase() &&
        u.passwordHash === credentials.password
    );

    if (!matchedUser) {
      safeLogger.warn('MockAuthService: login failed for user:', credentials.username);
      throw new Error('Invalid username or password. Please check your credentials.');
    }

    const userWithoutPassword: User = {
      id: matchedUser.id,
      name: matchedUser.name,
      username: matchedUser.username,
      email: matchedUser.email,
      role: matchedUser.role,
      isInternalUser: matchedUser.isInternalUser,
      companyName: matchedUser.companyName,
      avatarUrl: matchedUser.avatarUrl,
    };

    const session: Session = {
      token: `mock_token_${Date.now()}_${matchedUser.id}`,
      user: userWithoutPassword,
      serverUrl: credentials.serverUrl || 'https://mock-odoo.internal',
      database: credentials.database || 'odoo_sales_db',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    this.activeSession = session;
    safeLogger.info('MockAuthService: login successful for user:', session.user.username);
    return session;
  }

  async logout(): Promise<void> {
    safeLogger.info('MockAuthService: logging out');
    await new Promise((resolve) => setTimeout(resolve, 200));
    this.activeSession = null;
  }

  async getCurrentSession(): Promise<Session | null> {
    return this.activeSession;
  }
}
