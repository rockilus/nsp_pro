'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/auth-context';

function redirectToSignIn() {
  const pathLocaleMatch = window.location.pathname.match(/\/(en|fr|es)\//);
  const lng = pathLocaleMatch?.[1] || 'fr';
  window.location.href = `/${lng}/auth/signin`;
}

interface StaticAuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function StaticAuthGuard({ children, fallback }: StaticAuthGuardProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const [isRehydrated, setIsRehydrated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsRehydrated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isRehydrated && !loading && !isAuthenticated) {
      redirectToSignIn();
    }
  }, [isRehydrated, loading, isAuthenticated]);

  if (!isRehydrated || loading) {
    return fallback || <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return fallback || <div>Redirecting to sign in...</div>;
  }

  return <>{children}</>;
}
