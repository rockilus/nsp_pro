import { useCallback } from 'react';
// Types
import { ShiftT } from '../types/shift';
import {
  ShiftApi,
  ShiftUpdateResponse,
  ShiftDeleteResponse,
  ShiftsTabDataResponse,
} from '../app/lib/api/shiftApi';
import { useApiClient } from '../app/lib/api-client';
// Auth Context
import { useAuth } from '../contexts/auth-context';
import { env } from '@/config/env';

//////////////////////////
// Authenticated Shift Hooks //
//////////////////////////

/**
 * Hook for adding a new shift
 */
export function useAddShift() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const addShift = useCallback(
    async (shift: ShiftT): Promise<ShiftT> => {
      if (env.isDevelopment) {
        console.log('🔍 useAddShift called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          shiftId: shift.id,
          teamId: shift.teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      // Input validation
      if (!shift || !shift.teamId) {
        throw new Error('Invalid shift data provided');
      }

      try {
        const result = await ShiftApi.addShift(apiClient, shift);

        if (env.isDevelopment) {
          console.log('✅ Shift added successfully');
        }

        return result;
      } catch (error) {
        console.error('❌ Failed to add shift:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return addShift;
}

/**
 * Hook for getting shifts for a team
 */
export function useGetShifts() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getShifts = useCallback(
    async (teamId: string): Promise<ShiftT[]> => {
      if (env.isDevelopment) {
        console.log('🔍 useGetShifts called:', {
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
        return await ShiftApi.getShifts(apiClient, teamId);
      } catch (error) {
        console.error('❌ Failed to get shifts:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getShifts;
}

/**
 * Hook for getting work shifts for a team
 */
export function useGetWorkShifts() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getWorkShifts = useCallback(
    async (teamId: string): Promise<ShiftT[]> => {
      if (env.isDevelopment) {
        console.log('🔍 useGetWorkShifts called:', {
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
        return await ShiftApi.getWorkShifts(apiClient, teamId);
      } catch (error) {
        console.error('❌ Failed to get work shifts:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getWorkShifts;
}

/**
 * Hook for getting all shifts for a team
 */
export function useGetAllShifts() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getAllShifts = useCallback(
    async (teamId: string): Promise<ShiftT[]> => {
      if (env.isDevelopment) {
        console.log('🔍 useGetAllShifts called:', {
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
        return await ShiftApi.getAllShifts(apiClient, teamId);
      } catch (error) {
        console.error('❌ Failed to get all shifts:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getAllShifts;
}

/**
 * Hook for updating a shift
 */
export function useUpdateShift() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateShift = useCallback(
    async (updatedShift: ShiftT): Promise<ShiftUpdateResponse> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ShiftApi.updateShift(apiClient, updatedShift);
      } catch (error) {
        console.error('❌ Failed to update shift:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return updateShift;
}

/**
 * Hook for deleting a shift
 */
export function useDeleteShift() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteShift = useCallback(
    async (shiftId: string, teamId: string): Promise<ShiftDeleteResponse> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ShiftApi.deleteShift(apiClient, shiftId, teamId);
      } catch (error) {
        console.error('❌ Failed to delete shift:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading],
  );

  return deleteShift;
}

/**
 * Hook for getting shifts tab data
 */
export function useGetShiftsTabData() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getShiftsTabData = useCallback(
    async (teamId: string): Promise<ShiftsTabDataResponse> => {
      if (env.isDevelopment) {
        console.log('🔍 useGetShiftsTabData called:', {
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
        return await ShiftApi.getShiftsTabData(apiClient, teamId);
      } catch (error) {
        console.error('❌ Failed to get shifts tab data:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getShiftsTabData;
}
