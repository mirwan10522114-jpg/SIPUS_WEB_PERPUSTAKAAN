import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api, setTokens, clearTokens, getAccessToken } from '../api/client';
import type { PublicUser } from '../api/types';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<PublicUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getAccessToken());

  useEffect(() => {
    let cancelled = false;
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        if (!cancelled) setUser(res.data.data.user);
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api.post('/auth/login', { identifier, password });
    const { user: u, accessToken, refreshToken } = res.data.data;
    setTokens(accessToken, refreshToken);
    setUser(u);
    return u as PublicUser;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
