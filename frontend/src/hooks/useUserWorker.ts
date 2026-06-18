import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WorkerT } from '../types/worker';
import { UserApi } from '../app/lib/api/userApi';
import { useApiClient } from '../app/lib/api-client';
import { useAuth } from '../contexts/auth-context';

/**
 * React Query hook for fetching and caching the authenticated user's worker for a specific team.
 *
 * Uses React Query for automatic caching, background refetching, and cache invalidation.
 * Returns null if no worker is found for the user in the specified team.
 *
 * @param teamId - The team ID to fetch the user's worker for
 * @param enabled - Whether the query should run (default: true)
 *
 * @example
 * const { data: userWorker, isLoading, error } = useUserWorker(teamId);
 */
export function useUserWorker(teamId: string | null | undefined, enabled = true) {
  const apiClient = useApiClient();
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;

  return useQuery<WorkerT | null, Error>({
    queryKey: ['userWorker', teamId, userId],
    queryFn: async () => {
      if (!teamId) {
        return null;
      }
      return await UserApi.getUserWorker(apiClient, teamId);
    },
    enabled: enabled && isAuthenticated && !!teamId && !!userId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

/**
 * Hook to invalidate the user worker cache for a specific team.
 * Use this when workers are created, updated, attached, or detached.
 *
 * @example
 * const invalidateUserWorker = useInvalidateUserWorker();
 * // After attaching user to worker:
 * await invalidateUserWorker(teamId);
 */
export function useInvalidateUserWorker() {
  const queryClient = useQueryClient();

  return async (teamId?: string) => {
    if (teamId) {
      // Invalidate specific team's user worker
      await queryClient.invalidateQueries({
        queryKey: ['userWorker', teamId],
      });
    } else {
      // Invalidate all user worker queries
      await queryClient.invalidateQueries({
        queryKey: ['userWorker'],
      });
    }
  };
}
