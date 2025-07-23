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
  signOut: () => Promise<void>;
  signOutRedirect: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Validates that a URL is safe for logout redirect to prevent open redirect attacks
 */
const isValidLogoutUri = (uri: string): boolean => {
  try {
    const url = new URL(uri);
    const allowedHosts = [
      "www.rockilus.com",
      "app.rockilus.com",
      "localhost",
      "127.0.0.1",
    ];

    return (
      allowedHosts.includes(url.hostname) &&
      (url.protocol === "https:" ||
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
};

/**
 * Securely clears authentication tokens from both localStorage and sessionStorage
 * This handles cases where oidc-client-ts might use either storage mechanism
 */
const clearAuthTokens = (): void => {
  try {
    const tokenKey = `oidc.user:${cognitoAuthConfig.authority}:${cognitoAuthConfig.client_id}`;

    // Clear from both storage types
    localStorage.removeItem(tokenKey);
    sessionStorage.removeItem(tokenKey);

    // Clear any other OIDC-related items from both storages
    const storages = [localStorage, sessionStorage];

    storages.forEach((storage) => {
      try {
        const authKeys = Object.keys(storage).filter(
          (key) =>
            key.startsWith("oidc.") ||
            key.includes("cognito") ||
            key.includes("auth") ||
            key.startsWith("_capacitor_") // Capacitor storage prefix if using mobile
        );

        authKeys.forEach((key) => {
          storage.removeItem(key);
        });
      } catch (storageError) {
        console.warn(
          `Error clearing ${
            storage === localStorage ? "localStorage" : "sessionStorage"
          }:`,
          storageError
        );
      }
    });
  } catch (error) {
    console.error("Error clearing auth tokens:", error);
  }
};

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const auth = useOidcAuth();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Set loading to false once auth state is determined
    if (!auth.isLoading) {
      setLoading(false);
    }
  }, [auth.isLoading]);

  const signOutRedirect = async (): Promise<void> => {
    try {
      // Validate logout URI for security
      if (!isValidLogoutUri(logoutUri)) {
        throw new Error("Invalid logout URI detected");
      }

      // Clear local auth state first
      clearAuthTokens();
      // await auth.removeUser();

      // Use AWS recommended logout URL format
      const logoutUrl = `${cognitoDomain}/logout?client_id=${
        cognitoAuthConfig.client_id
      }&logout_uri=${encodeURIComponent(logoutUri)}`;

      // Use window.location.href as recommended by AWS
      window.location.href = logoutUrl;
    } catch (error) {
      console.error("Logout redirect failed:", error);

      // Fallback: clear local state and redirect to app
      try {
        clearAuthTokens();
        await auth.removeUser();

        if (isValidLogoutUri(logoutUri)) {
          window.location.href = logoutUri;
        } else {
          // Safe fallback to current origin
          window.location.href = window.location.origin;
        }
      } catch (fallbackError) {
        console.error("Fallback logout failed:", fallbackError);
        // Last resort: reload page to clear any remaining state
        window.location.reload();
      }
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      clearAuthTokens();
      await auth.removeUser();
    } catch (error) {
      console.error("Local signout failed:", error);
      // Still clear tokens even if removeUser fails
      clearAuthTokens();
    }
  };

  const contextValue: AuthContextType = {
    user: auth.user,
    loading: auth.isLoading || loading,
    error: auth.error,
    isAuthenticated: auth.isAuthenticated,
    accessToken: auth.user?.access_token || null,
    signIn: () => auth.signinRedirect(),
    signOut,
    signOutRedirect,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
