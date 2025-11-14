"use client";

import React from "react";
import { AuthProvider as OidcAuthProvider } from "react-oidc-context";
import { cognitoAuthConfig } from "../../config/cognito";
import { AuthContextProvider } from "../../contexts/auth-context";
import { env } from "@/config/env";
import { CookiesProvider } from "react-cookie";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Wrap both development and production flows with CookiesProvider so
  // any `useCookies` calls in the tree have a provider (fixes runtime
  // "Missing <CookiesProvider>" error).
  if (env.isDevelopment) {
    // Development mode: AuthContextProvider handles dev auth internally
    return (
      <CookiesProvider>
        <AuthContextProvider>{children}</AuthContextProvider>
      </CookiesProvider>
    );
  }

  // Production mode: use Cognito OIDC auth with wrapper
  return (
    <CookiesProvider>
      <OidcAuthProvider {...cognitoAuthConfig}>
        <AuthContextProvider>{children}</AuthContextProvider>
      </OidcAuthProvider>
    </CookiesProvider>
  );
}
