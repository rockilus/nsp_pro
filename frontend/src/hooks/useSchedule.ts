import { useCallback } from "react";
// Types
import {
  ScheduleT,
  ExportOptionsT,
  WorkTimeTableT,
  DuplicateRequestT,
  DuplicateResultT,
} from "../types/schedule";
import { AssignmentT } from "../types/assignment";
import { ShiftT } from "../types/shift";
import { WorkerT } from "../types/worker";
import { RecurrenceRuleT } from "../types/recurrence";
// API Client
import { ScheduleApi } from "../app/lib/api/scheduleApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

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
        console.log("🔍 useCreateSchedule called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      // Input validation
      if (!teamId || teamId.trim().length === 0) {
        throw new Error("Team ID is required");
      }

      try {
        const schedule = await ScheduleApi.createSchedule(apiClient, teamId);

        if (env.isDevelopment) {
          console.log("✅ Schedule created successfully");
        }

        return schedule;
      } catch (error) {
        console.error("❌ Failed to create schedule:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
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
        console.log("🔍 useGetSchedules called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ScheduleApi.getSchedules(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get schedules:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
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
        console.log("🔍 useGetWorkTimeTable called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          scheduleId,
          teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ScheduleApi.getWorkTimeTable(
          apiClient,
          scheduleId,
          teamId
        );
      } catch (error) {
        console.error("❌ Failed to get work time table:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
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
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ScheduleApi.updateSchedule(apiClient, schedule);
      } catch (error) {
        console.error("❌ Failed to update schedule:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
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
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        await ScheduleApi.deleteSchedule(apiClient, scheduleId, teamId);
      } catch (error) {
        console.error("❌ Failed to delete schedule:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
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
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ScheduleApi.validateSchedule(
          apiClient,
          scheduleId,
          teamId
        );
      } catch (error) {
        console.error("❌ Failed to validate schedule:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
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
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ScheduleApi.exportSchedule(
          apiClient,
          teamId,
          exportOptions
        );
      } catch (error) {
        console.error("❌ Failed to export schedule:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
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
      teamId: string
    ): Promise<DuplicateResultT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ScheduleApi.duplicatePeriod(
          apiClient,
          duplicateRequest,
          campaignId,
          teamId
        );
      } catch (error) {
        console.error("❌ Failed to duplicate period:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return duplicatePeriod;
}

/**
 * Hook for getting schedule tab data
 */
export function useGetScheduleTabData() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getScheduleTabData = useCallback(
    async (
      teamId: string
    ): Promise<{
      assignments: any;
      breaches: any[];
      requests: any[];
      schedule: ScheduleT[];
      shifts: ShiftT[];
      workers: WorkerT[];
      stats: any;
    }> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ScheduleApi.getScheduleTabData(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get schedule tab data:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getScheduleTabData;
}

/**
 * Hook for getting schedule assignments data
 */
export function useGetScheduleAssignmentsData() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getScheduleAssignmentsData = useCallback(
    async (
      teamId: string
    ): Promise<{
      assignments: AssignmentT[];
      recurrences: RecurrenceRuleT[];
      shifts: ShiftT[];
      workers: WorkerT[];
    }> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ScheduleApi.getScheduleAssignmentsData(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get schedule assignments data:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getScheduleAssignmentsData;
}

/**
 * Hook for getting schedule assignments data (no solver)
 */
export function useGetScheduleAssignmentsDataNoSolver() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getScheduleAssignmentsDataNoSolver = useCallback(
    async (
      teamId: string
    ): Promise<{
      assignments: AssignmentT[];
      recurrences: RecurrenceRuleT[];
      shifts: ShiftT[];
      workers: WorkerT[];
    }> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ScheduleApi.getScheduleAssignmentsDataNoSolver(
          apiClient,
          teamId
        );
      } catch (error) {
        console.error(
          "❌ Failed to get schedule assignments data (no solver):",
          {
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
          }
        );
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getScheduleAssignmentsDataNoSolver;
}

/**
 * Hook for getting schedule assignments data for members
 */
export function useGetScheduleAssignmentsDataMember() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getScheduleAssignmentsDataMember = useCallback(
    async (
      teamId: string
    ): Promise<{
      assignments: AssignmentT[];
      shifts: ShiftT[];
      workers: WorkerT[];
    }> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ScheduleApi.getScheduleAssignmentsDataMember(
          apiClient,
          teamId
        );
      } catch (error) {
        console.error("❌ Failed to get schedule assignments data (member):", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getScheduleAssignmentsDataMember;
}

/**
 * Hook for getting schedule LHS data
 */
export function useGetScheduleLHSData() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getScheduleLHSData = useCallback(
    async (
      teamId: string
    ): Promise<{
      breaches: any[];
      requests: any[];
      stats: any;
      specialties: any[];
    }> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ScheduleApi.getScheduleLHSData(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get schedule LHS data:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getScheduleLHSData;
}
