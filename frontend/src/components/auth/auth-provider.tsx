"use client";

import React from "react";
import { AuthProvider as OidcAuthProvider } from "react-oidc-context";
import { cognitoAuthConfig } from "../../config/cognito";
import { AuthContextProvider } from "../../contexts/auth-context";
import { DevAuthProvider } from "../../contexts/dev-auth-context";
import { isDevelopment } from "../../config/env";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  if (isDevelopment()) {
    // Development mode: use simple dev auth
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }

  // Production mode: use Cognito OIDC auth
  return (
    <OidcAuthProvider {...cognitoAuthConfig}>
      <AuthContextProvider>{children}</AuthContextProvider>
    </OidcAuthProvider>
  );
}
