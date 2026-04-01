import { useCallback } from "react";
// Types
import { ConstraintT, TemplateT } from "../types/constraint";
// API Client
import { ConstraintApi } from "../app/lib/api/constraintApi";
import { WorkerApi } from "../app/lib/api/workerApi";
import { ShiftApi } from "../app/lib/api/shiftApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

//////////////////////////
// Authenticated Constraint Hooks //
//////////////////////////

/**
 * Hook for adding a new constraint
 */
export function useAddConstraint() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const addConstraint = useCallback(
    async (constraint: ConstraintT): Promise<ConstraintT> => {
      if (env.isDevelopment) {
        console.log("🔍 useAddConstraint called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          constraintId: constraint.id,
          teamId: constraint.teamId,
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
      if (!constraint || !constraint.teamId) {
        throw new Error("Invalid constraint data provided");
      }

      try {
        const result = await ConstraintApi.addConstraint(apiClient, constraint);

        if (env.isDevelopment) {
          console.log("✅ Constraint added successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to add constraint:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return addConstraint;
}

/**
 * Hook for getting constraints by team ID
 */
export function useGetConstraints() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getConstraints = useCallback(
    async (teamId: string): Promise<ConstraintT[]> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetConstraints called:", {
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
        return await ConstraintApi.getConstraints(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get constraints:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getConstraints;
}

/**
 * Hook for updating a constraint
 */
export function useUpdateConstraint() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateConstraint = useCallback(
    async (updatedConstraint: ConstraintT): Promise<ConstraintT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await ConstraintApi.updateConstraint(
          apiClient,
          updatedConstraint,
        );
      } catch (error) {
        console.error("❌ Failed to update constraint:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return updateConstraint;
}

/**
 * Hook for deleting a constraint
 */
export function useDeleteConstraint() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteConstraint = useCallback(
    async (constraintId: string, teamId: string): Promise<void> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        await ConstraintApi.deleteConstraint(apiClient, constraintId, teamId);
      } catch (error) {
        console.error("❌ Failed to delete constraint:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return deleteConstraint;
}

/**
 * Hook for getting constraint templates by team ID
 */
export function useGetTemplates() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getTemplates = useCallback(
    async (teamId: string): Promise<TemplateT[]> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetTemplates called:", {
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
        return await ConstraintApi.getTemplates(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get templates:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getTemplates;
}

/**
 * Hook for getting all constraints tab data (templates, constraints, workers, shifts)
 */
export function useGetConstraintsTabData() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getConstraintsTabData = useCallback(
    async (teamId: string) => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        const constraintsTabData = await Promise.all([
          ConstraintApi.getTemplates(apiClient, teamId),
          ConstraintApi.getConstraints(apiClient, teamId),
          WorkerApi.getWorkers(apiClient, teamId, undefined, true),
          ShiftApi.getShifts(apiClient, teamId),
        ]);

        return {
          templates: constraintsTabData[0],
          constraints: constraintsTabData[1],
          workers: constraintsTabData[2],
          shifts: constraintsTabData[3],
        };
      } catch (error) {
        console.error("❌ Failed to get constraints tab data:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getConstraintsTabData;
}
