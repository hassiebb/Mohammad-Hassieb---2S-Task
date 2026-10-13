import React, { createContext, useContext, useEffect, useState } from 'react';
import { IAuthService, LoginCredentials, Session, User } from '@/types/auth';
import { authService } from '@/services';
import { safeLogger } from '@/lib/logger';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  service = authService,
}: {
  children: React.ReactNode;
  service?: IAuthService;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check initial session
    async function loadInitialSession() {
      try {
        const current = await service.getCurrentSession();
        setSession(current);
      } catch (err) {
        safeLogger.error('Failed to load initial session', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialSession();
  }, [service]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await service.login(credentials);
      setSession(newSession);
      safeLogger.info('User authenticated successfully', newSession.user.username);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      safeLogger.warn('Authentication failed', message);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await service.logout();
      setSession(null);
      setError(null);
    } catch (err) {
      safeLogger.error('Logout error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAuthenticated: Boolean(session),
        isLoading,
        error,
        login,
        logout,
        clearError,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
