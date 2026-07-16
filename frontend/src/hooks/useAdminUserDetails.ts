import { useCallback, useEffect, useRef, useState } from 'react';
// API Client
import { AdminApi, AdminUserDetails } from '@/app/lib/api/adminApi';
import { useApiClient } from '@/app/lib/api-client';
// Auth Context
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/config/env';

/**
 * Hook that returns a user's profile and team memberships for admin views.
 * Fetches once on mount and exposes loading / error state.
 */
export function useAdminUserDetails(userId: string) {
  const apiClient = useApiClient();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [details, setDetails] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFetched = useRef(false);

  const fetchDetails = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setError('User not authenticated - please sign in');
      setLoading(false);
      return;
    }

    try {
      if (env.isDevelopment) {
        console.log('🔍 useAdminUserDetails: fetching details for', userId);
      }
      const data = await AdminApi.getUserDetails(apiClient, userId);
      setDetails(data);
      setError(null);
    } catch (err) {
      console.error('❌ Failed to fetch admin user details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  }, [apiClient, authLoading, isAuthenticated, userId]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchDetails();
  }, [fetchDetails]);

  const refresh = useCallback(() => {
    hasFetched.current = false;
    setLoading(true);
    fetchDetails();
  }, [fetchDetails]);

  return { details, loading, error, refresh };
}
