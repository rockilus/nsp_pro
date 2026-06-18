import { useCallback, useEffect, useRef, useState } from 'react';
// Types
import { UserT } from '@/types/user';
// API Client
import { AdminApi } from '@/app/lib/api/adminApi';
import { useApiClient } from '@/app/lib/api-client';
// Auth Context
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/config/env';

/**
 * Hook that returns all users for admin views.
 * Fetches once on mount and exposes loading / error state.
 */
export function useAdminUsers() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<UserT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFetched = useRef(false);

  const fetchUsers = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setError('User not authenticated - please sign in');
      setLoading(false);
      return;
    }

    try {
      if (env.isDevelopment) {
        console.log('🔍 useAdminUsers: fetching all users');
      }
      const data = await AdminApi.listUsers(apiClient);
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error('❌ Failed to fetch admin users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [apiClient, authLoading, isAuthenticated]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchUsers();
  }, [fetchUsers]);

  const refresh = useCallback(() => {
    hasFetched.current = false;
    setLoading(true);
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refresh };
}
