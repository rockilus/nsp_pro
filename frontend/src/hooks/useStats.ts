import { useCallback } from "react";
// Types
import { StatsT, StatsHeaderT, StatsOptionsT } from "../types/stats";
import { ShiftWorkerOptionT } from "../types/constraint";
// API Client
import { StatsApi } from "../app/lib/api/statsApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";

//////////////////////////
// Authenticated Stats Hooks //
//////////////////////////

/**
 * Hook for getting stats for a team
 */
export function useGetStats() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getStats = useCallback(
    async (teamId: string, statsOptions: StatsOptionsT): Promise<StatsT> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetStats called:", {
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
        const stats = await StatsApi.getStats(apiClient, teamId, statsOptions);

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Stats fetched successfully");
        }

        return stats;
      } catch (error) {
        console.error("❌ Failed to get stats:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getStats;
}

/**
 * Hook for adding a stats header
 */
export function useAddHeader() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const addHeader = useCallback(
    async (header: StatsHeaderT): Promise<StatsHeaderT> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useAddHeader called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          headerTeamId: header.teamId,
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
        const addedHeader = await StatsApi.addHeader(apiClient, header);

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Header added successfully");
        }

        return addedHeader;
      } catch (error) {
        console.error("❌ Failed to add header:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return addHeader;
}

/**
 * Hook for deleting a stats header
 */
export function useDeleteHeader() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteHeader = useCallback(
    async (headerId: string, teamId: string): Promise<void> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useDeleteHeader called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          headerId,
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
        await StatsApi.deleteHeader(apiClient, headerId, teamId);

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Header deleted successfully");
        }
      } catch (error) {
        console.error("❌ Failed to delete header:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return deleteHeader;
}

/**
 * Hook for getting shift options for a team
 */
export function useGetShiftOptions() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getShiftOptions = useCallback(
    async (teamId: string): Promise<ShiftWorkerOptionT[]> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetShiftOptions called:", {
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
        const shiftOptions = await StatsApi.getShiftOptions(apiClient, teamId);

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Shift options fetched successfully");
        }

        return shiftOptions;
      } catch (error) {
        console.error("❌ Failed to get shift options:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getShiftOptions;
}

/**
 * Hook for getting stats tab data (combines multiple API calls)
 */
export function useGetStatsTabData() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getStatsTabData = useCallback(
    async (teamId: string) => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetStatsTabData called:", {
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
        // Import these functions dynamically to avoid circular dependencies
        const { getSchedules } = await import("../app/lib/schedule");
        const { getShifts } = await import("../app/lib/shift");
        const { getWorkers } = await import("../app/lib/worker");
        const { ScheduleStatus } = await import("../types/schedule");

        const statsTabData = await Promise.all([
          getSchedules(teamId),
          getShifts(teamId),
          getWorkers(teamId),
          StatsApi.getShiftOptions(apiClient, teamId),
        ]);

        const result = {
          scheduleCampaign:
            statsTabData[0].find(
              (schedule: any) => schedule.status === ScheduleStatus.CAMPAIGN
            ) || null,
          shifts: statsTabData[1],
          workers: statsTabData[2],
          shiftOptions: statsTabData[3],
        };

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Stats tab data fetched successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to get stats tab data:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getStatsTabData;
}
