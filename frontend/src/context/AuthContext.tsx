'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, authApi, setAuthToken, setUnauthorizedHandler } from '@/services/api';
import type { AuthResult, Role, User } from '@/services/types';

const STORAGE_KEY = 'memed.session';

interface AuthContextValue {
  user: User | null;
  /** False until the saved session has been read from the browser. */
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (input: { name: string; email: string; password: string; role: Role }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthResult) : null;
  } catch {
    return null;
  }
}

/**
 * Keeps the login token in localStorage and hands it to the API client.
 * (Trade-off noted in the README: simple and works across domains, but readable by page scripts.)
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthResult | null>(null);
  const [ready, setReady] = useState(false);

  const saveSession = useCallback((next: AuthResult | null) => {
    setSession(next);
    setAuthToken(next?.token ?? null);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private browsing can block storage; the session then lasts until the tab closes.
    }
  }, []);

  const logout = useCallback(() => {
    saveSession(null);
    router.replace('/login');
  }, [router, saveSession]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    const stored = readStoredSession();
    if (stored) {
      saveSession(stored);
      // Re-check in the background; only a definite 401 logs the user out (not a sleeping server).
      authApi
        .me()
        .then((user) => saveSession({ token: stored.token, user }))
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) saveSession(null);
        });
    }
    setReady(true);
  }, [logout, saveSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      ready,
      logout,
      async login(email, password) {
        const result = await authApi.login({ email, password });
        saveSession(result);
        return result.user;
      },
      async signup(input) {
        const result = await authApi.signup(input);
        saveSession(result);
        return result.user;
      },
    }),
    [session, ready, logout, saveSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
