import { useCallback } from 'react';
// Types
import {
  ScheduleT,
  ExportOptionsT,
  WorkTimeTableT,
  DuplicateRequestT,
  DuplicateResultT,
  RequestDeadlineT,
} from '../types/schedule';
import { AssignmentT } from '../types/assignment';
import { ShiftT } from '../types/shift';
import { WorkerT } from '../types/worker';
import { RecurrenceRuleT } from '../types/recurrence';
// API Client
import { ScheduleApi } from '../app/lib/api/scheduleApi';
import { useApiClient } from '../app/lib/api-client';
// Auth Context
import { useAuth } from '../contexts/auth-context';
import { env } from '@/config/env';
import { validateScheduleDuration } from '../types/schedule';

//////////////////////////
// Authenticated Schedule Hooks //
//////////////////////////

/**
 * Hook for creating a new schedule
 */
export function useCreateSchedule() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const createSchedule = useCallback(
    async (teamId: string): Promise<ScheduleT> => {
      if (env.isDevelopment) {
        console.log('🔍 useCreateSchedule called:', {
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

      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      // Input validation
      if (!teamId || teamId.trim().length === 0) {
        throw new Error('Team ID is required');
      }

      try {
        const schedule = await ScheduleApi.createSchedule(apiClient, teamId);

        if (env.isDevelopment) {
          console.log('✅ Schedule created successfully');
        }

        return schedule;
      } catch (error) {
        console.error('❌ Failed to create schedule:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return createSchedule;
}

/**
 * Hook for getting schedules for a team
 */
export function useGetSchedules() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getSchedules = useCallback(
    async (teamId: string): Promise<ScheduleT[]> => {
      if (env.isDevelopment) {
        console.log('🔍 useGetSchedules called:', {
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

      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ScheduleApi.getSchedules(apiClient, teamId);
      } catch (error) {
        console.error('❌ Failed to get schedules:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getSchedules;
}

/**
 * Hook for getting work time table
 */
export function useGetWorkTimeTable() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getWorkTimeTable = useCallback(
    async (scheduleId: string, teamId: string): Promise<WorkTimeTableT> => {
      if (env.isDevelopment) {
        console.log('🔍 useGetWorkTimeTable called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          scheduleId,
          teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ScheduleApi.getWorkTimeTable(apiClient, scheduleId, teamId);
      } catch (error) {
        console.error('❌ Failed to get work time table:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getWorkTimeTable;
}

/**
 * Hook for updating a schedule
 */
export function useUpdateSchedule() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateSchedule = useCallback(
    async (schedule: ScheduleT): Promise<ScheduleT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      // Client-side pre-flight validation: ensure schedule duration within limits
      try {
        validateScheduleDuration(schedule);
      } catch (e) {
        // Surface a clear client-side error without calling the API
        if (e instanceof Error) {
          console.error('❌ Schedule validation failed:', e.message);
          throw e;
        }
        throw new Error('Schedule validation failed');
      }

      try {
        return await ScheduleApi.updateSchedule(apiClient, schedule);
      } catch (error) {
        console.error('❌ Failed to update schedule:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return updateSchedule;
}

/**
 * Hook for deleting a schedule
 */
export function useDeleteSchedule() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteSchedule = useCallback(
    async (scheduleId: string, teamId: string): Promise<void> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        await ScheduleApi.deleteSchedule(apiClient, scheduleId, teamId);
      } catch (error) {
        console.error('❌ Failed to delete schedule:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return deleteSchedule;
}

/**
 * Hook for validating a schedule
 */
export function useValidateSchedule() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const validateSchedule = useCallback(
    async (scheduleId: string, teamId: string): Promise<ScheduleT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ScheduleApi.validateSchedule(apiClient, scheduleId, teamId);
      } catch (error) {
        console.error('❌ Failed to validate schedule:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return validateSchedule;
}

/**
 * Hook for exporting a schedule
 * @deprecated Use useExportSchedule from '../hooks/useExport' instead.
 * This hook will be removed in a future version.
 */
export function useExportSchedule() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const exportSchedule = useCallback(
    async (teamId: string, exportOptions: ExportOptionsT): Promise<any> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ScheduleApi.exportSchedule(apiClient, teamId, exportOptions);
      } catch (error) {
        console.error('❌ Failed to export schedule:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return exportSchedule;
}

/**
 * Hook for duplicating a period
 */
export function useDuplicatePeriod() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const duplicatePeriod = useCallback(
    async (
      duplicateRequest: DuplicateRequestT,
      campaignId: string,
      teamId: string,
    ): Promise<DuplicateResultT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ScheduleApi.duplicatePeriod(apiClient, duplicateRequest, campaignId, teamId);
      } catch (error) {
        console.error('❌ Failed to duplicate period:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return duplicatePeriod;
}

/**
 * Hook for getting schedule entities (shifts and workers only)
 *
 * Use this hook to fetch entity data that changes rarely.
 * For assignments, use useAssignmentsByPeriod hook with smart buffering instead.
 */
export function useGetScheduleEntities() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getScheduleEntities = useCallback(
    async (
      teamId: string,
    ): Promise<{
      shifts: ShiftT[];
      workers: WorkerT[];
    }> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ScheduleApi.getScheduleEntities(apiClient, teamId);
      } catch (error) {
        console.error('❌ Failed to get schedule entities:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getScheduleEntities;
}

/**
 * @deprecated Use useGetScheduleEntities + useAssignmentsByPeriod hook instead
 * Hook for getting schedule assignments data
 */
export function useGetScheduleAssignmentsData() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getScheduleAssignmentsData = useCallback(
    async (
      teamId: string,
      includeCampaign: boolean = true,
    ): Promise<{
      assignments: AssignmentT[];
      recurrences: RecurrenceRuleT[];
      shifts: ShiftT[];
      workers: WorkerT[];
    }> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ScheduleApi.getScheduleAssignmentsData(apiClient, teamId, includeCampaign);
      } catch (error) {
        console.error('❌ Failed to get schedule assignments data:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getScheduleAssignmentsData;
}

/**
 * @deprecated Use useGetScheduleEntities + useAssignmentsByPeriod hook instead
 * Hook for getting schedule assignments data (no solver)
 */
export function useGetScheduleAssignmentsDataNoSolver() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getScheduleAssignmentsDataNoSolver = useCallback(
    async (
      teamId: string,
      includeCampaign: boolean = true,
    ): Promise<{
      assignments: AssignmentT[];
      recurrences: RecurrenceRuleT[];
      shifts: ShiftT[];
      workers: WorkerT[];
    }> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await ScheduleApi.getScheduleAssignmentsDataNoSolver(
          apiClient,
          teamId,
          includeCampaign,
        );
      } catch (error) {
        console.error('❌ Failed to get schedule assignments data (no solver):', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getScheduleAssignmentsDataNoSolver;
}

/**
 * Hook for getting the request deadline for a team's campaign schedule
 */
export function useGetRequestDeadline(teamId: string | null | undefined) {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getRequestDeadline = useCallback(async (): Promise<RequestDeadlineT> => {
    if (loading) throw new Error('Authentication still loading - please wait');
    if (!isAuthenticated || !user?.id_token)
      throw new Error('User not authenticated - please sign in');
    if (!teamId) throw new Error('Team ID is required');
    return ScheduleApi.getRequestDeadline(apiClient, teamId);
  }, [apiClient, isAuthenticated, loading, user, teamId]);

  return getRequestDeadline;
}

/**
 * Hook for setting the request deadline on a campaign schedule
 */
export function useSetRequestDeadline() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const setRequestDeadline = useCallback(
    async (scheduleId: string, teamId: string, deadline: Date): Promise<ScheduleT> => {
      if (loading) throw new Error('Authentication still loading - please wait');
      if (!isAuthenticated || !user?.id_token)
        throw new Error('User not authenticated - please sign in');
      return ScheduleApi.setRequestDeadline(apiClient, scheduleId, teamId, deadline);
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return setRequestDeadline;
}

/**
 * Hook for sending a reminder notification for the request deadline
 */
export function useSendRequestDeadlineReminder() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const sendReminder = useCallback(
    async (scheduleId: string, teamId: string): Promise<ScheduleT> => {
      if (loading) throw new Error('Authentication still loading - please wait');
      if (!isAuthenticated || !user?.id_token)
        throw new Error('User not authenticated - please sign in');
      return ScheduleApi.sendRequestDeadlineReminder(apiClient, scheduleId, teamId);
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return sendReminder;
}

/**
 * Hook for editing the request deadline (new semantics: can move earlier or later)
 */
export function useEditRequestDeadline() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const editRequestDeadline = useCallback(
    async (scheduleId: string, teamId: string, newDeadline: Date): Promise<ScheduleT> => {
      if (loading) throw new Error('Authentication still loading - please wait');
      if (!isAuthenticated || !user?.id_token)
        throw new Error('User not authenticated - please sign in');
      return ScheduleApi.editRequestDeadline(apiClient, scheduleId, teamId, newDeadline);
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return editRequestDeadline;
}

/**
 * Hook for deleting the request deadline
 */
export function useDeleteRequestDeadline() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteRequestDeadline = useCallback(
    async (scheduleId: string, teamId: string): Promise<ScheduleT> => {
      if (loading) throw new Error('Authentication still loading - please wait');
      if (!isAuthenticated || !user?.id_token)
        throw new Error('User not authenticated - please sign in');
      return ScheduleApi.deleteRequestDeadline(apiClient, scheduleId, teamId);
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return deleteRequestDeadline;
}
