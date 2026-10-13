export type UserRole = 'sales_manager' | 'sales_user' | 'portal_user';

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  isInternalUser: boolean;
  avatarUrl?: string;
  companyName?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  serverUrl?: string;
  database?: string;
}

export interface Session {
  token: string;
  user: User;
  serverUrl?: string;
  database?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<Session>;
  logout(): Promise<void>;
  getCurrentSession(): Promise<Session | null>;
}
