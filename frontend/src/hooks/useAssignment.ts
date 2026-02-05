import { useCallback } from "react";
import dayjs from "dayjs";
// Types
import {
  AssignmentT,
  AssignmentsRecurrencesResultT,
} from "../types/assignment";
import { RecurrenceRuleT, RecurrenceUpdateScope } from "../types/recurrence";
import { ReplacementCandidateT } from "../types/replacement";
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
 * Hook for getting assignments by date range with optional filters
 */
export function useGetAssignments() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getAssignments = useCallback(
    async (
      teamId: string,
      includeCampaign: boolean = false,
      startDate?: dayjs.Dayjs,
      endDate?: dayjs.Dayjs,
      workerId?: string,
    ): Promise<AssignmentsRecurrencesResultT> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetAssignments called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          includeCampaign,
          startDate: startDate?.format("YYYY-MM-DD"),
          endDate: endDate?.format("YYYY-MM-DD"),
          workerId,
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
      if (!teamId) {
        throw new Error("Team ID is required");
      }

      try {
        const result = await AssignmentApi.getAssignments(
          apiClient,
          teamId,
          includeCampaign,
          startDate,
          endDate,
          workerId,
        );

        if (env.isDevelopment) {
          console.log("✅ Assignments retrieved successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to get assignments:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getAssignments;
}

/**
 * Hook for adding assignment with optional recurrence
 */
export function useAddAssignmentAndRecurrence() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const addAssignmentAndRecurrence = useCallback(
    async (
      assignment: AssignmentT,
      recurrence: RecurrenceRuleT | null = null,
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
          recurrence,
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
    [apiClient, isAuthenticated, loading, user],
  );

  return addAssignmentAndRecurrence;
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
      recurrenceUpdateScope: RecurrenceUpdateScope | null = null,
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
          recurrenceUpdateScope,
        );
      } catch (error) {
        console.error("❌ Failed to update assignment:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
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
      recurrenceUpdateScope: RecurrenceUpdateScope | null = null,
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
          recurrenceUpdateScope,
        );
      } catch (error) {
        console.error("❌ Failed to delete assignment:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return deleteAssignment;
}

/**
 * Hook for getting replacement candidates for an assignment
 */
export function useGetReplacementCandidates() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getReplacementCandidates = useCallback(
    async (
      assignmentId: string,
      teamId: string,
    ): Promise<ReplacementCandidateT[]> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetReplacementCandidates called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          assignmentId,
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

      // Validate required parameters
      if (!assignmentId || !teamId) {
        throw new Error("Assignment ID and team ID are required");
      }

      try {
        const result = await AssignmentApi.getReplacementCandidates(
          apiClient,
          assignmentId,
          teamId,
        );

        if (env.isDevelopment) {
          console.log("✅ Replacement candidates retrieved successfully:", {
            timestamp: new Date().toISOString(),
            count: result.length,
          });
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to get replacement candidates:", error);
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getReplacementCandidates;
}
