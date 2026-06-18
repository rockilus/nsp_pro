'use client';

import React from 'react';
import { AuthContextProvider } from '../../contexts/auth-context';
import { CookiesProvider } from 'react-cookie';
import ReactQueryProvider from '../providers/ReactQueryProvider';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <CookiesProvider>
      <AuthContextProvider>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </AuthContextProvider>
    </CookiesProvider>
  );
}
