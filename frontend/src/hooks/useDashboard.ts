import { useCallback } from "react";
// Types
import { UserDashboardT } from "../types/user";
// API Client
import { DashboardApi } from "../app/lib/api/dashboardApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

//////////////////////////
// Authenticated Dashboard Hooks //
//////////////////////////

/**
 * Hook for checking user authorization for dashboard access
 */
export function useCheckUserAuthz() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const checkUserAuthz = useCallback(async (): Promise<boolean> => {
    if (env.isDevelopment) {
      console.log("🔍 useCheckUserAuthz called:", {
        timestamp: new Date().toISOString(),
        isAuthenticated,
        hasUser: !!user,
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
      return await DashboardApi.checkUserAuthz(apiClient);
    } catch (error) {
      console.error("❌ Failed to check user authorization:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }, [apiClient, isAuthenticated, loading, user]);

  return checkUserAuthz;
}

/**
 * Hook for getting all users dashboard data
 */
export function useGetUsersDashboard() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getUsersDashboard = useCallback(async (): Promise<UserDashboardT[]> => {
    if (env.isDevelopment) {
      console.log("🔍 useGetUsersDashboard called:", {
        timestamp: new Date().toISOString(),
        isAuthenticated,
        hasUser: !!user,
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
      return await DashboardApi.getUsersDashboard(apiClient);
    } catch (error) {
      console.error("❌ Failed to fetch users dashboard:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }, [apiClient, isAuthenticated, loading, user]);

  return getUsersDashboard;
}

/**
 * Hook for getting specific user dashboard data
 */
export function useGetUserDashboard() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getUserDashboard = useCallback(
    async (userId: string): Promise<UserDashboardT> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetUserDashboard called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          userId,
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
        return await DashboardApi.getUserDashboard(apiClient, userId);
      } catch (error) {
        console.error("❌ Failed to fetch user dashboard:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getUserDashboard;
}

/**
 * Hook for impersonating a user
 */
export function useImpersonateUser() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const impersonateUser = useCallback(
    async (userId: string): Promise<boolean> => {
      if (env.isDevelopment) {
        console.log("🔍 useImpersonateUser called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          userId,
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
        return await DashboardApi.impersonateUser(apiClient, userId);
      } catch (error) {
        console.error("❌ Failed to impersonate user:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return impersonateUser;
}

/**
 * Hook for stopping impersonation
 */
export function useStopImpersonation() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const stopImpersonation = useCallback(async (): Promise<boolean> => {
    if (env.isDevelopment) {
      console.log("🔍 useStopImpersonation called:", {
        timestamp: new Date().toISOString(),
        isAuthenticated,
        hasUser: !!user,
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
      return await DashboardApi.stopImpersonation(apiClient);
    } catch (error) {
      console.error("❌ Failed to stop impersonation:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }, [apiClient, isAuthenticated, loading, user]);

  return stopImpersonation;
}

/**
 * Hook for deleting a user
 */
export function useDeleteUser() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteUser = useCallback(
    async (userId: string): Promise<boolean> => {
      if (env.isDevelopment) {
        console.log("🔍 useDeleteUser called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          userId,
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
        return await DashboardApi.deleteUser(apiClient, userId);
      } catch (error) {
        console.error("❌ Failed to delete user:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return deleteUser;
}
