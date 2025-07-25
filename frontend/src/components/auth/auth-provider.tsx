"use client";

import React from "react";
import { AuthProvider as OidcAuthProvider } from "react-oidc-context";
import { cognitoAuthConfig } from "../../config/cognito";
import { AuthContextProvider } from "../../contexts/auth-context";
import { isDevelopment } from "../../config/env";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  if (isDevelopment()) {
    // Development mode: AuthContextProvider handles dev auth internally
    return <AuthContextProvider>{children}</AuthContextProvider>;
  }

  // Production mode: use Cognito OIDC auth with wrapper
  return (
    <OidcAuthProvider {...cognitoAuthConfig}>
      <AuthContextProvider>{children}</AuthContextProvider>
    </OidcAuthProvider>
  );
}
