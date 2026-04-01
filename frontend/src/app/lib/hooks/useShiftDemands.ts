/**
 * React Query hooks for shift demand management
 * Provides data fetching, caching, and mutation capabilities
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShiftDemandDTO,
  ShiftDemandCreateDTO,
  ShiftDemandUpdateDTO,
  ShiftDemandMatrix,
  ShiftDemandSource,
  BulkUpsertResponse,
  UseShiftDemandsResult,
  UseShiftDemandMutationsResult,
} from '../../../types/shiftDemand';
import { ShiftDemandApi } from '../api/shiftDemandApi';
import { useApiClient } from '../api-client';
import { useAuth } from '../../../contexts/auth-context';
import dayjs from 'dayjs';
/**
 * Query key factory for shift demands
 */
export const shiftDemandKeys = {
  all: ['shift-demands'] as const,
  teams: (teamId: string) => [...shiftDemandKeys.all, 'team', teamId] as const,
  period: (teamId: string, startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) =>
    [
      ...shiftDemandKeys.teams(teamId),
      'period',
      startDate.toISOString(),
      endDate.toISOString(),
    ] as const,
  matrix: (teamId: string, startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) =>
    [
      ...shiftDemandKeys.teams(teamId),
      'matrix',
      startDate.toISOString(),
      endDate.toISOString(),
    ] as const,
  summary: (teamId: string, startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) =>
    [
      ...shiftDemandKeys.teams(teamId),
      'summary',
      startDate.toISOString(),
      endDate.toISOString(),
    ] as const,
  shift: (teamId: string, shiftId: string, startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) =>
    [
      ...shiftDemandKeys.teams(teamId),
      'shift',
      shiftId,
      startDate.toISOString(),
      endDate.toISOString(),
    ] as const,
  source: (teamId: string, source: ShiftDemandSource, sourceId?: string) =>
    [...shiftDemandKeys.teams(teamId), 'source', source, sourceId] as const,
};

/**
 * Hook for fetching shift demands by period
 */
export const useShiftDemandsByPeriod = (
  teamId: string,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  options?: {
    bufferDays?: number;
    refetchInterval?: number;
    enabled?: boolean;
  },
) => {
  const apiClient = useApiClient();
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: shiftDemandKeys.period(teamId, startDate, endDate),
    queryFn: () =>
      ShiftDemandApi.getShiftDemandsByPeriod(
        apiClient,
        teamId,
        startDate,
        endDate,
        options?.bufferDays,
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled !== false && isAuthenticated && !!user?.id_token,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching shift demands matrix
 */
export const useShiftDemandsMatrix = (
  teamId: string,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  options?: {
    enabled?: boolean;
  },
) => {
  const apiClient = useApiClient();
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: shiftDemandKeys.matrix(teamId, startDate, endDate),
    queryFn: () => ShiftDemandApi.getShiftDemandsMatrix(apiClient, teamId, startDate, endDate),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled !== false && isAuthenticated && !!user?.id_token,
    refetchOnWindowFocus: false,
  });
};

/**
 * Comprehensive hook that fetches all shift demand data for a period with enhanced mapping
 */
export const useShiftDemands = (
  teamId: string,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  options?: {
    bufferDays?: number;
    refetchInterval?: number;
    enabled?: boolean;
  },
): UseShiftDemandsResult => {
  const demandsQuery = useShiftDemandsByPeriod(teamId, startDate, endDate, options);
  const matrixQuery = useShiftDemandsMatrix(teamId, startDate, endDate, options);

  const demands = useMemo(() => demandsQuery.data || [], [demandsQuery.data]);

  // Create demandsById Map using shiftId-date combination for O(1) lookups
  const demandsById = useMemo(() => {
    const map = new Map<string, ShiftDemandDTO>();
    demands.forEach((demand) => {
      if (demand.id) {
        // Use shiftId-date combination as key for cell lookups
        const dateStr = new Date(demand.date * 1000).toISOString().split('T')[0];
        const key = `${demand.shiftId}-${dateStr}`;
        map.set(key, demand);
      }
    });
    return map;
  }, [demands]);

  return {
    demands,
    demandsById,
    matrix: matrixQuery.data || {},
    isLoading: demandsQuery.isLoading || matrixQuery.isLoading,
    error: demandsQuery.error || matrixQuery.error,
  };
};

/**
 * Enhanced hook for shift demand mutations with proper error handling and optimistic updates
 */
export const useShiftDemandMutations = (teamId: string): UseShiftDemandMutationsResult => {
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const { isAuthenticated, user } = useAuth();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: shiftDemandKeys.teams(teamId) });
  };

  // Create mutation with optimistic updates
  const create = useMutation({
    mutationFn: async (params: { demand: Omit<ShiftDemandCreateDTO, 'teamId'> }) => {
      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }
      return ShiftDemandApi.createShiftDemand(apiClient, teamId, params.demand);
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: shiftDemandKeys.teams(teamId),
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(shiftDemandKeys.teams(teamId));

      // Optimistically update the cache
      const optimisticDemand: ShiftDemandDTO = {
        ...variables.demand,
        teamId,
        id: `temp-${Date.now()}`, // Temporary ID
        createdAt: Date.now() / 1000,
        updatedAt: Date.now() / 1000,
      };

      // Update any cached queries that match this team
      queryClient.setQueryData(shiftDemandKeys.teams(teamId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          demands: [...(old.demands || []), optimisticDemand],
        };
      });

      return { previousData, optimisticDemand };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(shiftDemandKeys.teams(teamId), context.previousData);
      }
      console.error('Failed to create shift demand:', err);
    },
    onSettled: () => {
      // Always refetch after error or success
      invalidateQueries();
    },
  });

  // Update mutation with optimistic updates and zero count handling
  const update = useMutation({
    mutationFn: async (params: { demandId: string; demand: ShiftDemandUpdateDTO }) => {
      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      return ShiftDemandApi.updateShiftDemand(apiClient, teamId, params.demandId, params.demand);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: shiftDemandKeys.teams(teamId),
      });

      const previousData = queryClient.getQueryData(shiftDemandKeys.teams(teamId));

      // Handle zero count differently in optimistic updates
      if (variables.demand.count === 0) {
        // Optimistically remove the demand
        queryClient.setQueryData(shiftDemandKeys.teams(teamId), (old: any) => {
          if (!old) return old;

          return {
            ...old,
            demands: old.demands?.filter(
              (demand: ShiftDemandDTO) => demand.id !== variables.demandId,
            ),
          };
        });
      } else {
        // Optimistically update existing demand
        queryClient.setQueryData(shiftDemandKeys.teams(teamId), (old: any) => {
          if (!old) return old;

          const updatedDemands = old.demands?.map((demand: ShiftDemandDTO) =>
            demand.id === variables.demandId
              ? { ...demand, ...variables.demand, updatedAt: Date.now() / 1000 }
              : demand,
          );

          return {
            ...old,
            demands: updatedDemands,
          };
        });
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(shiftDemandKeys.teams(teamId), context.previousData);
      }
      console.error('Failed to update shift demand:', err);
    },
    onSettled: () => {
      invalidateQueries();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (demandId: string) => {
      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }
      await ShiftDemandApi.deleteShiftDemand(apiClient, teamId, demandId);
    },
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.setQueryData(shiftDemandKeys.teams(teamId), (old: any) => {
        if (!old) return old;

        const filteredDemands = old.demands?.filter(
          (demand: ShiftDemandDTO) => demand.id !== deletedId,
        );

        return {
          ...old,
          demands: filteredDemands,
        };
      });
    },
    onError: (error: Error) => {
      console.error('Failed to delete shift demand:', error);
    },
    onSettled: () => {
      invalidateQueries();
    },
  });

  // Bulk upsert mutation (for bulk operations)
  const bulkUpsert = useMutation({
    mutationFn: async (demands: Omit<ShiftDemandCreateDTO, 'teamId'>[]) => {
      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }
      return ShiftDemandApi.bulkUpsertShiftDemands(apiClient, teamId, demands);
    },
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (error: Error) => {
      console.error('Failed to bulk upsert shift demands:', error);
    },
  });

  return {
    create: {
      mutate: create.mutate,
      mutateAsync: create.mutateAsync,
      isLoading: create.isPending,
      error: create.error,
    },
    update: {
      mutate: update.mutate,
      mutateAsync: update.mutateAsync,
      isLoading: update.isPending,
      error: update.error,
    },
    delete: {
      mutate: deleteMutation.mutate,
      mutateAsync: deleteMutation.mutateAsync,
      isLoading: deleteMutation.isPending,
      error: deleteMutation.error,
    },
    bulkUpsert: {
      mutate: bulkUpsert.mutate,
      mutateAsync: bulkUpsert.mutateAsync,
      isLoading: bulkUpsert.isPending,
      error: bulkUpsert.error,
    },
  };
};
