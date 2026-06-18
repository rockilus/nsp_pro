import { useCallback } from 'react';
// API Client
import { AdminApi } from '@/app/lib/api/adminApi';
import { useApiClient } from '@/app/lib/api-client';
// Storage utilities (no circular dependency with api-client)
import {
  IMPERSONATION_SESSION_KEY,
  StoredImpersonationTarget,
  getImpersonationTarget,
  getImpersonationToken,
  clearImpersonationTarget,
} from '@/app/lib/impersonation-storage';
// Auth Context
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/config/env';

export { IMPERSONATION_SESSION_KEY, getImpersonationTarget, getImpersonationToken };

/** Shape stored in sessionStorage and used by ImpersonationBanner. */
export type ImpersonationTarget = StoredImpersonationTarget;

/** Input shape for starting impersonation — token is added by the hook. */
export type ImpersonationTargetInput = Omit<StoredImpersonationTarget, 'token'>;

/**
 * Hook for starting admin impersonation of a target user account.
 *
 * On success:
 *  - Writes impersonating_user_id on the admin's DB record (server-side)
 *  - Stores the target user info in sessionStorage for the banner
 *  - Navigates to the target user's default page
 */
export function useStartImpersonation() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  return useCallback(
    async (targetUserId: string): Promise<void> => {
      if (loading) throw new Error('Authentication still loading - please wait');
      if (!isAuthenticated) throw new Error('User not authenticated - please sign in');
      if (!targetUserId) throw new Error('Target user ID is required');

      if (env.isDevelopment) {
        console.log('🔍 useStartImpersonation: starting impersonation', {
          targetUserId,
        });
      }

      const { token } = await AdminApi.startImpersonation(apiClient, targetUserId);

      const target: ImpersonationTarget = {
        userId: targetUserId,
        firstName: '',
        lastName: '',
        email: '',
        language: 'en',
        token,
      };

      sessionStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(target));

      // Navigate using the stored language fallback
      window.location.href = `/en/plan/workers`;
    },
    [apiClient, isAuthenticated, loading],
  );
}

/**
 * Enriched variant used by AdminUsersTab where the full target UserT is known
 * before the API call. Stores proper display info in sessionStorage.
 */
export function useStartImpersonationWithTarget() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  return useCallback(
    async (target: ImpersonationTargetInput): Promise<void> => {
      if (loading) throw new Error('Authentication still loading - please wait');
      if (!isAuthenticated) throw new Error('User not authenticated - please sign in');

      if (env.isDevelopment) {
        console.log('🔍 useStartImpersonationWithTarget: impersonating', target.userId);
      }

      const { token } = await AdminApi.startImpersonation(apiClient, target.userId);

      sessionStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify({ ...target, token }));

      // Navigate to the target user's default page in their language
      window.location.href = `/${target.language}/plan/workers`;
    },
    [apiClient, isAuthenticated, loading],
  );
}

/**
 * Hook for stopping admin impersonation and returning to the admin panel.
 */
export function useStopAdminImpersonation() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  return useCallback(async (): Promise<void> => {
    if (loading) throw new Error('Authentication still loading - please wait');
    if (!isAuthenticated) throw new Error('User not authenticated - please sign in');

    if (env.isDevelopment) {
      console.log('🔍 useStopAdminImpersonation: stopping impersonation');
    }

    // Clear sessionStorage BEFORE the API call so that api-client does not
    // attach the (potentially expired) X-Impersonation-Token header. The
    // server is fully stateless — there is nothing to roll back.
    clearImpersonationTarget();

    try {
      await AdminApi.stopImpersonation(apiClient);
    } catch (err) {
      // The server had nothing to clean up, so log and continue regardless.
      if (env.isDevelopment) {
        console.warn('🔍 useStopAdminImpersonation: API call failed (ignored):', err);
      }
    }

    window.location.href = '/en/admin/users';
  }, [apiClient, isAuthenticated, loading]);
}
