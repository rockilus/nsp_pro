'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/auth-context';

interface StaticAuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function StaticAuthGuard({ children, fallback }: StaticAuthGuardProps) {
  const { isAuthenticated, loading, user, signIn } = useAuth();
  const [isRehydrated, setIsRehydrated] = useState(false);

  useEffect(() => {
    // Wait for client-side hydration in static deployment
    const timer = setTimeout(() => {
      console.log('🔄 Static deployment hydration check:', {
        isAuthenticated,
        loading,
        hasUser: !!user,
        hasIdToken: !!user?.id_token,
        timestamp: new Date().toISOString(),
      });
      setIsRehydrated(true);
    }, 100); // Small delay to ensure hydration

    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, user]);

  // Actively redirect to Cognito when we know the user is unauthenticated,
  // rather than just showing a static fallback with no recovery path.
  useEffect(() => {
    if (isRehydrated && !loading && !isAuthenticated) {
      console.warn('🚫 StaticAuthGuard: not authenticated — redirecting to sign-in');
      signIn();
    }
  }, [isRehydrated, loading, isAuthenticated, signIn]);

  // Show loading during hydration
  if (!isRehydrated || loading) {
    return fallback || <div>Loading authentication...</div>;
  }

  // Show fallback while redirect is in-flight
  if (!isAuthenticated || !user?.id_token) {
    return fallback || <div>Redirecting to sign in...</div>;
  }

  return <>{children}</>;
}
