/**
 * React Query hooks for assignment management
 * Provides data fetching, caching, and smart buffering capabilities
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { AssignmentT, AssignmentsRecurrencesResultT } from '../../../types/assignment';
import { RecurrenceRuleT } from '../../../types/recurrence';
import { AssignmentApi } from '../api/assignmentApi';
import { useApiClient } from '../api-client';
import { useAuth } from '../../../contexts/auth-context';
import { env } from '@/config/env';

/**
 * Query key factory for assignments
 * Provides consistent query keys for cache management
 */
export const assignmentsQueryKeys = {
  all: ['assignments'] as const,
  teams: (teamId: string) => [...assignmentsQueryKeys.all, 'team', teamId] as const,
  byPeriod: (
    teamId: string,
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
    includeCampaign: boolean,
    workerId?: string,
    shiftTypes?: number[],
  ) =>
    [
      ...assignmentsQueryKeys.teams(teamId),
      'period',
      startDate.format('YYYY-MM-DD'),
      endDate.format('YYYY-MM-DD'),
      includeCampaign,
      workerId,
      shiftTypes ? shiftTypes.slice().sort().join(',') : undefined,
    ] as const,
};

export interface UseAssignmentsByPeriodResult {
  assignments: AssignmentT[];
  recurrences: RecurrenceRuleT[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching assignments by date range with buffered loading
 *
 * Uses React Query for automatic caching and background refetching.
 * Follows the same pattern as useShiftDemands for consistency.
 *
 * @param teamId - Team identifier
 * @param startDate - Start of date range (inclusive)
 * @param endDate - End of date range (inclusive)
 * @param includeCampaign - Include campaign assignments (owners/leaders only)
 * @param workerId - Optional worker filter (useful for mobile views)
 * @param options - Query configuration options
 * @returns Assignments and recurrences with loading state
 */
export const useAssignmentsByPeriod = (
  teamId: string,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  includeCampaign: boolean = false,
  workerId?: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  },
  shiftTypes?: number[],
): UseAssignmentsByPeriodResult => {
  const apiClient = useApiClient();
  const { isAuthenticated, user, loading } = useAuth();

  const query = useQuery({
    queryKey: assignmentsQueryKeys.byPeriod(
      teamId,
      startDate,
      endDate,
      includeCampaign,
      workerId,
      shiftTypes,
    ),
    queryFn: async (): Promise<AssignmentsRecurrencesResultT> => {
      if (env.isDevelopment) {
        console.log('🔍 Fetching assignments:', {
          teamId,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          includeCampaign,
          workerId,
        });
      }

      // Validate authentication state
      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      const result = await AssignmentApi.getAssignments(
        apiClient,
        teamId,
        includeCampaign,
        startDate,
        endDate,
        workerId,
        shiftTypes,
      );

      if (env.isDevelopment) {
        console.log('✅ Assignments fetched:', {
          assignmentCount: result.assignmentsRead.length,
          recurrenceCount: result.recurrencesRead.length,
        });
      }

      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled !== false && !loading && isAuthenticated,
    refetchOnWindowFocus: false,
    // Keep previous data while fetching new data (smoother UX during navigation)
    placeholderData: (previousData) => previousData,
  });

  return {
    assignments: query.data?.assignmentsRead || [],
    recurrences: query.data?.recurrencesRead || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
};

/**
 * Hook to get the query client for manual cache operations
 * Useful for prefetching and cache invalidation
 */
export const useAssignmentsQueryClient = () => {
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const { isAuthenticated, user } = useAuth();

  return {
    /**
     * Prefetch assignments for a date range
     * Useful for loading data before user navigates to it
     */
    prefetchAssignments: async (
      teamId: string,
      startDate: dayjs.Dayjs,
      endDate: dayjs.Dayjs,
      includeCampaign: boolean = false,
      workerId?: string,
    ) => {
      if (!isAuthenticated) {
        return;
      }

      await queryClient.prefetchQuery({
        queryKey: assignmentsQueryKeys.byPeriod(
          teamId,
          startDate,
          endDate,
          includeCampaign,
          workerId,
        ),
        queryFn: () =>
          AssignmentApi.getAssignments(
            apiClient,
            teamId,
            includeCampaign,
            startDate,
            endDate,
            workerId,
          ),
        staleTime: 5 * 60 * 1000,
      });
    },

    /**
     * Invalidate all assignment queries for a team
     * Call after create/update/delete operations
     */
    invalidateAssignments: (teamId: string) => {
      queryClient.invalidateQueries({
        queryKey: assignmentsQueryKeys.teams(teamId),
      });
    },

    /**
     * Get cached assignments without triggering a fetch
     */
    getCachedAssignments: (
      teamId: string,
      startDate: dayjs.Dayjs,
      endDate: dayjs.Dayjs,
      includeCampaign: boolean = false,
      workerId?: string,
    ): AssignmentsRecurrencesResultT | undefined => {
      return queryClient.getQueryData(
        assignmentsQueryKeys.byPeriod(teamId, startDate, endDate, includeCampaign, workerId),
      );
    },
  };
};
