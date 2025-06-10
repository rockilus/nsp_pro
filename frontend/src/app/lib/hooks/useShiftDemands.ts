/**
 * React Query hooks for shift demand management
 * Provides data fetching, caching, and mutation capabilities
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShiftDemandDTO,
  ShiftDemandMatrix,
  ShiftDemandSummary,
  ShiftDemandSource,
  BulkUpsertResponse,
  CopyPeriodConfig,
  UseShiftDemandsResult,
  UseShiftDemandMutationsResult,
  DemandTemplate,
  DemandPattern,
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
 * Hook for fetching shift demands summary
 */
export const useShiftDemandsSummary = (
  teamId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: shiftDemandKeys.summary(teamId, startDate, endDate),
    queryFn: () =>
      ShiftDemandApi.getShiftDemandsSummary(teamId, startDate, endDate),
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
  const summaryQuery = useShiftDemandsSummary(
    teamId,
    startDate,
    endDate,
    options
  );

  return {
    demands: demandsQuery.data || [],
    matrix: matrixQuery.data || {},
    summary: summaryQuery.data || {},
    isLoading:
      demandsQuery.isLoading || matrixQuery.isLoading || summaryQuery.isLoading,
    error: demandsQuery.error || matrixQuery.error || summaryQuery.error,
    refetch: () => {
      demandsQuery.refetch();
      matrixQuery.refetch();
      summaryQuery.refetch();
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

  const copyPeriod = useMutation({
    mutationFn: (config: CopyPeriodConfig) =>
      ShiftDemandApi.copyDemandsFromPeriod(teamId, config),
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (error: Error) => {
      console.error("Failed to copy period:", error);
    },
  });

  const deletePeriod = useMutation({
    mutationFn: ({
      startDate,
      endDate,
      shiftIds,
    }: {
      startDate: Date;
      endDate: Date;
      shiftIds?: string[];
    }) =>
      ShiftDemandApi.deleteDemandsInPeriod(
        teamId,
        startDate,
        endDate,
        shiftIds
      ),
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (error: Error) => {
      console.error("Failed to delete period demands:", error);
    },
  });

  return {
    bulkUpsert: {
      mutate: bulkUpsert.mutate,
      isLoading: bulkUpsert.isPending,
      error: bulkUpsert.error,
    },
    copyPeriod: {
      mutate: copyPeriod.mutate,
      isLoading: copyPeriod.isPending,
      error: copyPeriod.error,
    },
    deletePeriod: {
      mutate: deletePeriod.mutate,
      isLoading: deletePeriod.isPending,
      error: deletePeriod.error,
    },
  };
};

/**
 * Hook for fetching demands by shift and date range
 */
export const useShiftDemandsByShift = (
  teamId: string,
  shiftId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: shiftDemandKeys.shift(teamId, shiftId, startDate, endDate),
    queryFn: () =>
      ShiftDemandApi.getDemandsByShiftAndDateRange(
        teamId,
        shiftId,
        startDate,
        endDate
      ),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for fetching demands by source
 */
export const useShiftDemandsBySource = (
  teamId: string,
  source: ShiftDemandSource,
  sourceId?: string,
  options?: {
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: shiftDemandKeys.source(teamId, source, sourceId),
    queryFn: () => ShiftDemandApi.getDemandsBySource(teamId, source, sourceId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled !== false,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook for prefetching adjacent periods
 */
export const usePrefetchAdjacentPeriods = (
  teamId: string,
  currentStart: Date,
  currentEnd: Date
) => {
  const queryClient = useQueryClient();

  const prefetchPeriod = async (startDate: Date, endDate: Date) => {
    await queryClient.prefetchQuery({
      queryKey: shiftDemandKeys.period(teamId, startDate, endDate),
      queryFn: () =>
        ShiftDemandApi.getShiftDemandsByPeriod(teamId, startDate, endDate),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchPrevious = () => {
    const periodLength = currentEnd.getTime() - currentStart.getTime();
    const prevStart = new Date(currentStart.getTime() - periodLength);
    const prevEnd = new Date(currentEnd.getTime() - periodLength);
    return prefetchPeriod(prevStart, prevEnd);
  };

  const prefetchNext = () => {
    const periodLength = currentEnd.getTime() - currentStart.getTime();
    const nextStart = new Date(currentStart.getTime() + periodLength);
    const nextEnd = new Date(currentEnd.getTime() + periodLength);
    return prefetchPeriod(nextStart, nextEnd);
  };

  return {
    prefetchPrevious,
    prefetchNext,
  };
};

/**
 * Custom hook for optimistic updates
 */
export const useOptimisticShiftDemands = (
  teamId: string,
  startDate: Date,
  endDate: Date
) => {
  const queryClient = useQueryClient();
  const queryKey = shiftDemandKeys.period(teamId, startDate, endDate);

  const updateOptimistically = (
    shiftId: string,
    date: string,
    newCount: number
  ) => {
    queryClient.setQueryData(
      queryKey,
      (oldData: ShiftDemandDTO[] | undefined) => {
        if (!oldData) return oldData;

        const targetTimestamp = Math.floor(new Date(date).getTime() / 1000);
        const existingIndex = oldData.findIndex(
          (demand) =>
            demand.shiftId === shiftId && demand.date === targetTimestamp
        );

        if (existingIndex >= 0) {
          // Update existing demand
          const updated = [...oldData];
          updated[existingIndex] = {
            ...updated[existingIndex],
            count: newCount,
            updatedAt: Math.floor(Date.now() / 1000),
          };
          return updated;
        } else {
          // Create new demand
          const newDemand: ShiftDemandDTO = {
            id: null, // Will be set by server
            shiftId,
            teamId,
            date: targetTimestamp,
            count: newCount,
            notes: null,
            source: "manual",
            sourceId: null,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
          };
          return [...oldData, newDemand];
        }
      }
    );

    // Also update matrix if it exists
    const matrixKey = shiftDemandKeys.matrix(teamId, startDate, endDate);
    queryClient.setQueryData(
      matrixKey,
      (oldMatrix: ShiftDemandMatrix | undefined) => {
        if (!oldMatrix) return oldMatrix;

        return {
          ...oldMatrix,
          [shiftId]: {
            ...oldMatrix[shiftId],
            [date]: newCount,
          },
        };
      }
    );
  };

  return {
    updateOptimistically,
  };
};

/**
 * Hook for fetching demand templates
 */
export const useDemandTemplates = (teamId: string) => {
  return useQuery({
    queryKey: ["demand-templates", teamId],
    queryFn: () => ShiftDemandApi.getDemandTemplates(teamId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook for demand template mutations
 */
export const useDemandTemplateMutations = (teamId: string) => {
  const queryClient = useQueryClient();

  const invalidateTemplates = () => {
    queryClient.invalidateQueries({ queryKey: ["demand-templates", teamId] });
  };

  const createTemplate = useMutation({
    mutationFn: (
      template: Omit<DemandTemplate, "id" | "createdAt" | "updatedAt">
    ) => ShiftDemandApi.createDemandTemplate(teamId, template),
    onSuccess: invalidateTemplates,
    onError: (error: Error) => {
      console.error("Failed to create template:", error);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: ({
      templateId,
      template,
    }: {
      templateId: string;
      template: Partial<DemandTemplate>;
    }) => ShiftDemandApi.updateDemandTemplate(teamId, templateId, template),
    onSuccess: invalidateTemplates,
    onError: (error: Error) => {
      console.error("Failed to update template:", error);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: (templateId: string) =>
      ShiftDemandApi.deleteDemandTemplate(teamId, templateId),
    onSuccess: invalidateTemplates,
    onError: (error: Error) => {
      console.error("Failed to delete template:", error);
    },
  });

  return {
    createTemplate: {
      mutate: createTemplate.mutate,
      isLoading: createTemplate.isPending,
      error: createTemplate.error,
    },
    updateTemplate: {
      mutate: updateTemplate.mutate,
      isLoading: updateTemplate.isPending,
      error: updateTemplate.error,
    },
    deleteTemplate: {
      mutate: deleteTemplate.mutate,
      isLoading: deleteTemplate.isPending,
      error: deleteTemplate.error,
    },
  };
};

/**
 * Hook for fetching demand patterns
 */
export const useDemandPatterns = (teamId: string) => {
  return useQuery({
    queryKey: ["demand-patterns", teamId],
    queryFn: () => ShiftDemandApi.getDemandPatterns(teamId),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook for demand pattern mutations
 */
export const useDemandPatternMutations = (teamId: string) => {
  const queryClient = useQueryClient();

  const invalidatePatterns = () => {
    queryClient.invalidateQueries({ queryKey: ["demand-patterns", teamId] });
  };

  const createPattern = useMutation({
    mutationFn: (
      pattern: Omit<DemandPattern, "id" | "createdAt" | "updatedAt">
    ) => ShiftDemandApi.createDemandPattern(teamId, pattern),
    onSuccess: invalidatePatterns,
    onError: (error: Error) => {
      console.error("Failed to create pattern:", error);
    },
  });

  const updatePattern = useMutation({
    mutationFn: ({
      patternId,
      pattern,
    }: {
      patternId: string;
      pattern: Partial<DemandPattern>;
    }) => ShiftDemandApi.updateDemandPattern(teamId, patternId, pattern),
    onSuccess: invalidatePatterns,
    onError: (error: Error) => {
      console.error("Failed to update pattern:", error);
    },
  });

  const deletePattern = useMutation({
    mutationFn: (patternId: string) =>
      ShiftDemandApi.deleteDemandPattern(teamId, patternId),
    onSuccess: invalidatePatterns,
    onError: (error: Error) => {
      console.error("Failed to delete pattern:", error);
    },
  });

  return {
    createPattern: {
      mutate: createPattern.mutate,
      isLoading: createPattern.isPending,
      error: createPattern.error,
    },
    updatePattern: {
      mutate: updatePattern.mutate,
      isLoading: updatePattern.isPending,
      error: updatePattern.error,
    },
    deletePattern: {
      mutate: deletePattern.mutate,
      isLoading: deletePattern.isPending,
      error: deletePattern.error,
    },
  };
};
