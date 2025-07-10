"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth as useOidcAuth, ErrorContext } from "react-oidc-context";
import { User } from "oidc-client-ts";
import { cognitoAuthConfig, cognitoDomain, logoutUri } from "../config/cognito";

interface AuthContextType {
  user: User | undefined | null;
  loading: boolean;
  error: ErrorContext | undefined;
  isAuthenticated: boolean;
  accessToken: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  signOutRedirect: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useOidcAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set loading to false once auth state is determined
    if (!auth.isLoading) {
      setLoading(false);
    }
  }, [auth.isLoading]);

  const signOutRedirect = () => {
    // const logoutUri = cognitoAuthConfig.post_logout_redirect_uri;
    window.location.href = `${cognitoDomain}/logout?client_id=${
      cognitoAuthConfig.client_id
    }&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  const contextValue: AuthContextType = {
    user: auth.user,
    loading: auth.isLoading || loading,
    error: auth.error,
    isAuthenticated: auth.isAuthenticated,
    accessToken: auth.user?.access_token || null,
    signIn: () => auth.signinRedirect(),
    signOut: () => auth.removeUser(),
    signOutRedirect,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
