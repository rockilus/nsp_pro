import { useCallback } from "react";
// Types
import {
  SolveTaskStatusResponseT,
  SolveRequestT,
} from "../types/solveTaskStatus";
// API Client
import { SqsSolveApi } from "../app/lib/api/sqsSolveApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

//////////////////////////
// Authenticated SQS Solve Hooks //
//////////////////////////

/**
 * Hook for starting a solve request
 */
export function useStartSolve() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const startSolve = useCallback(
    async (request: SolveRequestT): Promise<SolveTaskStatusResponseT> => {
      if (env.isDevelopment) {
        console.log("🔍 useStartSolve called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          request,
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
        console.log("useStartSolve Debug:", {
          apiClient,
          request,
        });

        const response = await SqsSolveApi.startSolve(apiClient, request);

        if (env.isDevelopment) {
          console.log("✅ Solve started successfully");
        }

        return response;
      } catch (error) {
        console.error("❌ Failed to start solve:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return startSolve;
}

/**
 * Hook for getting solve status
 */
export function useGetSolveStatus() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getSolveStatus = useCallback(
    async (solveId: string): Promise<SolveTaskStatusResponseT> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetSolveStatus called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          solveId,
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
        return await SqsSolveApi.getSolveStatus(apiClient, solveId);
      } catch (error) {
        console.error("❌ Failed to get solve status:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getSolveStatus;
}

/**
 * Hook for canceling a solve request
 */
export function useCancelSolve() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const cancelSolve = useCallback(
    async (solveId: string): Promise<void> => {
      if (env.isDevelopment) {
        console.log("🔍 useCancelSolve called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          solveId,
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
        await SqsSolveApi.cancelSolve(apiClient, solveId);

        if (env.isDevelopment) {
          console.log("✅ Solve canceled successfully");
        }
      } catch (error) {
        console.error("❌ Failed to cancel solve:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return cancelSolve;
}

/**
 * Hook for getting latest solve status for a schedule
 */
export function useGetLatestSolveStatus() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getLatestSolveStatus = useCallback(
    async (scheduleId: string): Promise<SolveTaskStatusResponseT | null> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetLatestSolveStatus called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          scheduleId,
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
        return await SqsSolveApi.getLatestSolveStatus(apiClient, scheduleId);
      } catch (error) {
        console.error("❌ Failed to get latest solve status:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getLatestSolveStatus;
}
