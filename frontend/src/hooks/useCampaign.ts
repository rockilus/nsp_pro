import { useCallback } from "react";
// Types
import { ScheduleT } from "../types/schedule";
import { ConstraintT } from "../types/constraint";
// API Client
import {
  CampaignApi,
  CampaignTabData,
  CampaignTabDataNoSolver,
} from "../app/lib/api/campaignApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";

//////////////////////////
// Authenticated Campaign Hooks //
//////////////////////////

/**
 * Hook for getting campaign tab data (schedules + constraints)
 */
export function useGetCampaignTabData() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getCampaignTabData = useCallback(
    async (teamId: string): Promise<CampaignTabData> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetCampaignTabData called:", {
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
        const result = await CampaignApi.getCampaignTabData(apiClient, teamId);

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Campaign tab data fetched successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to get campaign tab data:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getCampaignTabData;
}

/**
 * Hook for getting campaign tab data without constraints (for teams not using solver)
 */
export function useGetCampaignTabDataNoSolver() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getCampaignTabDataNoSolver = useCallback(
    async (teamId: string): Promise<CampaignTabDataNoSolver> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetCampaignTabDataNoSolver called:", {
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
        const result = await CampaignApi.getCampaignTabDataNoSolver(
          apiClient,
          teamId
        );

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Campaign tab data (no solver) fetched successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to get campaign tab data (no solver):", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getCampaignTabDataNoSolver;
}
