/**
 * React Query hooks for shift demand management
 * Provides data fetching, caching, and mutation capabilities
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShiftDemandDTO,
  ShiftDemandSource,
  UseShiftDemandsResult,
  UseShiftDemandMutationsResult,
} from "@/types/shiftDemand";
import { ShiftDemandApi } from "@/app/lib/api/shiftDemandApi";

/**
 * Query key factory for shift demands
 */
export const shiftDemandKeys = {
  all: ["shift-demands"] as const,
  teams: (teamId: string) => [...shiftDemandKeys.all, "team", teamId] as const,
  period: (teamId: string, startDate: Date, endDate: Date) =>
    [
      ...shiftDemandKeys.teams(teamId),
      "period",
      startDate.toISOString(),
      endDate.toISOString(),
    ] as const,
  matrix: (teamId: string, startDate: Date, endDate: Date) =>
    [
      ...shiftDemandKeys.teams(teamId),
      "matrix",
      startDate.toISOString(),
      endDate.toISOString(),
    ] as const,
  summary: (teamId: string, startDate: Date, endDate: Date) =>
    [
      ...shiftDemandKeys.teams(teamId),
      "summary",
      startDate.toISOString(),
      endDate.toISOString(),
    ] as const,
  shift: (teamId: string, shiftId: string, startDate: Date, endDate: Date) =>
    [
      ...shiftDemandKeys.teams(teamId),
      "shift",
      shiftId,
      startDate.toISOString(),
      endDate.toISOString(),
    ] as const,
  source: (teamId: string, source: ShiftDemandSource, sourceId?: string) =>
    [...shiftDemandKeys.teams(teamId), "source", source, sourceId] as const,
};

/**
 * Hook for fetching shift demands by period
 */
export const useShiftDemandsByPeriod = (
  teamId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    bufferDays?: number;
    refetchInterval?: number;
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: shiftDemandKeys.period(teamId, startDate, endDate),
    queryFn: () =>
      ShiftDemandApi.getShiftDemandsByPeriod(
        teamId,
        startDate,
        endDate,
        options?.bufferDays
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching shift demands matrix
 */
export const useShiftDemandsMatrix = (
  teamId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: shiftDemandKeys.matrix(teamId, startDate, endDate),
    queryFn: () =>
      ShiftDemandApi.getShiftDemandsMatrix(teamId, startDate, endDate),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
  });
};

/**
 * Comprehensive hook that fetches all shift demand data for a period
 */
export const useShiftDemands = (
  teamId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    bufferDays?: number;
    refetchInterval?: number;
    enabled?: boolean;
  }
): UseShiftDemandsResult => {
  const demandsQuery = useShiftDemandsByPeriod(
    teamId,
    startDate,
    endDate,
    options
  );
  const matrixQuery = useShiftDemandsMatrix(
    teamId,
    startDate,
    endDate,
    options
  );

  const demands = demandsQuery.data || [];
  const demandsById = new Map(
    demands
      .filter((demand) => demand.id !== null)
      .map((demand) => [demand.id!, demand])
  );

  return {
    demands,
    demandsById,
    matrix: matrixQuery.data || {},
    isLoading: demandsQuery.isLoading || matrixQuery.isLoading,
    error: demandsQuery.error || matrixQuery.error,
    refetch: () => {
      demandsQuery.refetch();
      matrixQuery.refetch();
    },
  };
};

/**
 * Hook for shift demand mutations (create, update, delete)
 */
export const useShiftDemandMutations = (
  teamId: string
): UseShiftDemandMutationsResult => {
  const queryClient = useQueryClient();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: shiftDemandKeys.teams(teamId) });
  };

  const create = useMutation({
    mutationFn: (
      demand: Omit<ShiftDemandDTO, "id" | "createdAt" | "updatedAt">
    ) => ShiftDemandApi.createShiftDemand(teamId, demand),
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (error: Error) => {
      console.error("Failed to create shift demand:", error);
    },
  });

  const update = useMutation({
    mutationFn: ({
      demandId,
      demand,
    }: {
      demandId: string;
      demand: Partial<ShiftDemandDTO>;
    }) => ShiftDemandApi.updateShiftDemand(teamId, demandId, demand),
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (error: Error) => {
      console.error("Failed to update shift demand:", error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (demandId: string) =>
      ShiftDemandApi.deleteShiftDemand(teamId, demandId),
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (error: Error) => {
      console.error("Failed to delete shift demand:", error);
    },
  });

  const bulkUpsert = useMutation({
    mutationFn: (demands: Partial<ShiftDemandDTO>[]) =>
      ShiftDemandApi.bulkUpsertShiftDemands(teamId, demands),
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (error: Error) => {
      console.error("Failed to bulk upsert shift demands:", error);
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
