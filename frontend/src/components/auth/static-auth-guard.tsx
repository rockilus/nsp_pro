"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/auth-context";

interface StaticAuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function StaticAuthGuard({ children, fallback }: StaticAuthGuardProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const [isRehydrated, setIsRehydrated] = useState(false);

  useEffect(() => {
    // Wait for client-side hydration in static deployment
    const timer = setTimeout(() => {
      console.log("🔄 Static deployment hydration check:", {
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

  // Show loading during hydration
  if (!isRehydrated || loading) {
    return fallback || <div>Loading authentication...</div>;
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated || !user?.id_token) {
    console.warn("🚫 Authentication required - redirecting to sign-in");
    return fallback || <div>Please sign in to continue</div>;
  }

  return <>{children}</>;
}
