import { useCallback } from "react";
// Types
import { StatsT, StatsHeaderT, StatsOptionsT } from "../types/stats";
import { ShiftWorkerOptionT } from "../types/constraint";
import { ScheduleStatus } from "../types/schedule";
// API Client
import { StatsApi } from "../app/lib/api/statsApi";
import { ScheduleApi } from "../app/lib/api/scheduleApi";
import { WorkerApi } from "../app/lib/api/workerApi";
import { ShiftApi } from "../app/lib/api/shiftApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

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
      if (env.isDevelopment) {
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

        if (env.isDevelopment) {
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
      if (env.isDevelopment) {
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

        if (env.isDevelopment) {
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
      if (env.isDevelopment) {
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

        if (env.isDevelopment) {
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
      if (env.isDevelopment) {
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

        if (env.isDevelopment) {
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
      if (env.isDevelopment) {
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
        const statsTabData = await Promise.all([
          ScheduleApi.getSchedules(apiClient, teamId),
          ShiftApi.getShifts(apiClient, teamId),
          WorkerApi.getAllWorkers(apiClient, teamId),
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

        if (env.isDevelopment) {
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
