"use client";

import React from "react";
import { AuthProvider as OidcAuthProvider } from "react-oidc-context";
import { cognitoAuthConfig } from "../../config/cognito";
import { AuthContextProvider } from "../../contexts/auth-context";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <OidcAuthProvider {...cognitoAuthConfig}>
      <AuthContextProvider>{children}</AuthContextProvider>
    </OidcAuthProvider>
  );
}
