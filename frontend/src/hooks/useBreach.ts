import { useCallback } from 'react';
// Types
import { BreachT } from '../types/breach';
// API Client
import { BreachApi } from '../app/lib/api/breachApi';
import { useApiClient } from '../app/lib/api-client';
// Auth Context
import { useAuth } from '../contexts/auth-context';
import { env } from '@/config/env';

//////////////////////////
// Authenticated Breach Hooks //
//////////////////////////

/**
 * Hook for getting breaches for a team
 */
export function useGetBreaches() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getBreaches = useCallback(
    async (teamId: string): Promise<BreachT[]> => {
      if (env.isDevelopment) {
        console.log('🔍 useGetBreaches called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await BreachApi.getBreaches(apiClient, teamId);
      } catch (error) {
        console.error('❌ Failed to get breaches:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getBreaches;
}
