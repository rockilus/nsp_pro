import { useCallback } from "react";
// Types
import { ReplacementCandidateT } from "../types/replacement";
// API Client
import { AssignmentApi } from "../app/lib/api/assignmentApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

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
