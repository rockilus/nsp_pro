'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { env } from '../config/env';
import { AuthApi, SignUpData } from '../app/lib/api/authApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  language: string;
  systemRole: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const resp = await fetch(`${env.apiUrl}/users/me`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (resp.status === 401) return null;
  if (!resp.ok) {
    // Don't throw — treat any error as "not authenticated"
    return null;
  }
  const data = await resp.json();
  return {
    id: data.id,
    email: data.email || data['email'],
    firstName: data.firstName || data['first_name'],
    lastName: data.lastName || data['last_name'],
    language: data.language,
    systemRole: data.systemRole || data['system_role'] || null,
  };
}

function CookieAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const u = await fetchCurrentUser();
        if (!cancelled) {
          setUser(u);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await AuthApi.signIn({ email, password });
      const u = await fetchCurrentUser();
      setUser(u);
    } catch (e: any) {
      setError(e.message || 'Sign in failed');
      setUser(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (data: SignUpData) => {
    setError(null);
    try {
      await AuthApi.signUp(data);
    } catch (e: any) {
      setError(e.message || 'Sign up failed');
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await AuthApi.signOut();
    } catch {
      // best-effort — cookies cleared by backend
    }
    setUser(null);
    setLoading(false);
  }, []);

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    setError(null);
    try {
      await AuthApi.confirmSignUp({ email, code });
    } catch (e: any) {
      setError(e.message || 'Confirmation failed');
      throw e;
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await AuthApi.forgotPassword({ email });
    } catch (e: any) {
      setError(e.message || 'Request failed');
      throw e;
    }
  }, []);

  const confirmForgotPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      setError(null);
      try {
        await AuthApi.confirmForgotPassword({ email, code, new_password: newPassword });
      } catch (e: any) {
        setError(e.message || 'Password reset failed');
        throw e;
      }
    },
    [],
  );

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    confirmSignUp,
    forgotPassword,
    confirmForgotPassword,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Root provider
// ---------------------------------------------------------------------------

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <CookieAuthProvider>{children}</CookieAuthProvider>;
}
