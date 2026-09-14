import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { currentUserRequest, loginRequest } from './api';
import { clearAuthToken, getAuthToken, setAuthToken } from './authStorage';
import { AuthSession } from './types';

interface AuthContextValue {
  session: AuthSession | null;
  isRestoring: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;
        const user = await currentUserRequest(token);
        if (mounted) setSession({ token, user });
      } catch {
        await clearAuthToken();
      } finally {
        if (mounted) setIsRestoring(false);
      }
    };
    void restore();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isRestoring,
    signIn: async (email, password) => {
      const nextSession = await loginRequest(email, password);
      await setAuthToken(nextSession.token);
      setSession(nextSession);
    },
    signOut: async () => {
      await clearAuthToken();
      setSession(null);
    },
  }), [session, isRestoring]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
};
