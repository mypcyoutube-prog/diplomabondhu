import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { configureAuthHooks, login as apiLogin, logout as apiLogout, refreshAccessToken } from './api/client';
import type { AuthUser } from './api/client';
import { permissionsForRole } from './permissions';

interface AuthState {
  user: AuthUser | null;
  permissions: string[];
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = 'db_admin_access_token';
const USER_KEY = 'db_admin_user';

const AuthContext = createContext<AuthState>({
  user: null,
  permissions: [],
  ready: false,
  signIn: async () => {},
  signOut: async () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (token && raw) {
      try {
        setUser(JSON.parse(raw) as AuthUser);
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
    configureAuthHooks(
      () => localStorage.getItem(STORAGE_KEY),
      (t) => {
        if (t) localStorage.setItem(STORAGE_KEY, t);
        else localStorage.removeItem(STORAGE_KEY);
      },
      () => {
        setUser(null);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(STORAGE_KEY);
      }
    );
    if (token) {
      void refreshAccessToken();
    }
    setReady(true);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: u, accessToken } = await apiLogin(email, password);
    if (u.role === 'student') {
      throw Object.assign(new Error('Admin panel is for admins and moderators only'), { name: 'ApiError' });
    }
    localStorage.setItem(STORAGE_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const permissions = useMemo(() => permissionsForRole(user?.role), [user?.role]);

  const value = useMemo<AuthState>(
    () => ({ user, permissions, ready, signIn, signOut }),
    [user, permissions, ready, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
