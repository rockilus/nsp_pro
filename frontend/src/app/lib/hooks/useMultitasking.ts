/**
 * React Query hooks for multitasking functionality
 * Provides data fetching and caching for shift demand concurrency
 */

import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { ShiftDemandConcurrency } from '@/types/multitasking';
import { useGetShiftDemandConcurrency } from '@/hooks/useMultitasking';

/**
 * Query key factory for multitasking data
 */
export const multitaskingKeys = {
  all: ['multitasking'] as const,
  teams: (teamId: string) => [...multitaskingKeys.all, 'team', teamId] as const,
  concurrency: (teamId: string, startDate: Dayjs, endDate: Dayjs) =>
    [
      ...multitaskingKeys.teams(teamId),
      'concurrency',
      startDate.toISOString(),
      endDate.toISOString(),
    ] as const,
} as const;

/**
 * Hook to fetch shift demand concurrency data for a team and period
 */
export const useShiftDemandConcurrency = (
  teamId: string,
  startDate: Dayjs,
  endDate: Dayjs,
  enabled: boolean = true,
) => {
  const getShiftDemandConcurrency = useGetShiftDemandConcurrency();

  return useQuery({
    queryKey: multitaskingKeys.concurrency(teamId, startDate, endDate),
    queryFn: () => getShiftDemandConcurrency(teamId, startDate, endDate),
    enabled: enabled && !!teamId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Result type for the concurrency hook
 */
export type UseShiftDemandConcurrencyResult = ReturnType<typeof useShiftDemandConcurrency>;

/**
 * Utility function to get concurrent shift demand IDs for a specific shift demand
 */
export const getConcurrentShiftDemandIds = (
  concurrencyList: ShiftDemandConcurrency[],
  shiftDemandId: string,
): string[] => {
  const concurrency = concurrencyList.find((item) => item.shiftDemandId === shiftDemandId);
  return concurrency?.concurrentShiftDemandIds || [];
};

/**
 * Utility function to check if two shift demands can be worked concurrently
 */
export const canWorkConcurrently = (
  concurrencyList: ShiftDemandConcurrency[],
  shiftDemandId1: string,
  shiftDemandId2: string,
): boolean => {
  const concurrentIds = getConcurrentShiftDemandIds(concurrencyList, shiftDemandId1);
  return concurrentIds.includes(shiftDemandId2);
};

/**
 * Utility function to get all shift demands that can work with a given set
 */
export const getCompatibleShiftDemands = (
  concurrencyList: ShiftDemandConcurrency[],
  selectedShiftDemandIds: string[],
): string[] => {
  if (selectedShiftDemandIds.length === 0) {
    return concurrencyList.map((item) => item.shiftDemandId);
  }

  // Find shift demands that are compatible with ALL selected shift demands
  const allShiftDemandIds = concurrencyList.map((item) => item.shiftDemandId);

  return allShiftDemandIds.filter((shiftDemandId) => {
    // Skip if already selected
    if (selectedShiftDemandIds.includes(shiftDemandId)) {
      return false;
    }

    // Check if this shift demand is compatible with all selected ones
    return selectedShiftDemandIds.every((selectedId) =>
      canWorkConcurrently(concurrencyList, shiftDemandId, selectedId),
    );
  });
};
