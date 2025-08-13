import { useCallback } from "react";
import dayjs from "dayjs";
// Types
import {
  AssignmentT,
  AssignmentsRecurrencesResultT,
} from "../types/assignment";
import { RecurrenceRuleT, RecurrenceUpdateScope } from "../types/recurrence";
// API Client
import { AssignmentApi } from "../app/lib/api/assignmentApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

//////////////////////////
// Authenticated Assignment Hooks //
//////////////////////////

/**
 * Hook for adding assignment with optional recurrence
 */
export function useAddAssignmentAndRecurrence() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const addAssignmentAndRecurrence = useCallback(
    async (
      assignment: AssignmentT,
      recurrence: RecurrenceRuleT | null = null
    ): Promise<AssignmentsRecurrencesResultT> => {
      if (env.isDevelopment) {
        console.log("🔍 useAddAssignmentAndRecurrence called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          assignmentId: assignment.id,
          teamId: assignment.teamId,
          hasRecurrence: !!recurrence,
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
      if (!assignment || !assignment.teamId) {
        throw new Error("Assignment and team ID are required");
      }

      try {
        const result = await AssignmentApi.addAssignmentAndRecurrence(
          apiClient,
          assignment,
          recurrence
        );

        if (env.isDevelopment) {
          console.log("✅ Assignment added successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to add assignment:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return addAssignmentAndRecurrence;
}

/**
 * Hook for getting assignments by date range
 */
export function useGetAssignmentsByDates() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getAssignmentsByDates = useCallback(
    async (
      teamId: string,
      startDate?: dayjs.Dayjs,
      endDate?: dayjs.Dayjs
    ): Promise<AssignmentsRecurrencesResultT> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetAssignmentsByDates called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          startDate: startDate?.format("YYYY-MM-DD"),
          endDate: endDate?.format("YYYY-MM-DD"),
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
        return await AssignmentApi.getAssignmentsByDates(
          apiClient,
          teamId,
          startDate,
          endDate
        );
      } catch (error) {
        console.error("❌ Failed to fetch assignments:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getAssignmentsByDates;
}

/**
 * Hook for getting validated assignments by date range
 */
export function useGetValidatedAssignments() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getValidatedAssignments = useCallback(
    async (
      teamId: string,
      startDate?: dayjs.Dayjs,
      endDate?: dayjs.Dayjs
    ): Promise<AssignmentT[]> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetValidatedAssignments called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          startDate: startDate?.format("YYYY-MM-DD"),
          endDate: endDate?.format("YYYY-MM-DD"),
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
        return await AssignmentApi.getValidatedAssignments(
          apiClient,
          teamId,
          startDate,
          endDate
        );
      } catch (error) {
        console.error("❌ Failed to fetch validated assignments:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getValidatedAssignments;
}

/**
 * Hook for updating assignment with optional recurrence
 */
export function useUpdateAssignmentAndRecurrence() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateAssignmentAndRecurrence = useCallback(
    async (
      assignment: AssignmentT,
      teamId: string,
      recurrenceRule: RecurrenceRuleT | null = null,
      recurrenceUpdateScope: RecurrenceUpdateScope | null = null
    ): Promise<AssignmentsRecurrencesResultT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await AssignmentApi.updateAssignmentAndRecurrence(
          apiClient,
          assignment,
          teamId,
          recurrenceRule,
          recurrenceUpdateScope
        );
      } catch (error) {
        console.error("❌ Failed to update assignment:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return updateAssignmentAndRecurrence;
}

/**
 * Hook for deleting assignment
 */
export function useDeleteAssignment() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteAssignment = useCallback(
    async (
      assignmentId: string,
      teamId: string,
      recurrenceId: string | null = null,
      recurrenceUpdateScope: RecurrenceUpdateScope | null = null
    ): Promise<AssignmentsRecurrencesResultT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await AssignmentApi.deleteAssignment(
          apiClient,
          assignmentId,
          teamId,
          recurrenceId,
          recurrenceUpdateScope
        );
      } catch (error) {
        console.error("❌ Failed to delete assignment:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return deleteAssignment;
}
