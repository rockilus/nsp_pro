import { useCallback } from "react";
// Types
import { TeamT, TeamWithMembership } from "../types/team";
import { UserWithMembership } from "../types/user";
// API Client
import { TeamApi } from "../app/lib/api/teamApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";

//////////////////////////
// Authenticated Team Hooks //
//////////////////////////

/**
 * Hook for creating a new team
 */
export function useCreateTeam() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const createTeam = useCallback(
    async (teamName: string): Promise<TeamWithMembership> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useCreateTeam called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamName,
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
      if (!teamName || teamName.trim().length === 0) {
        throw new Error("Team name is required");
      }

      try {
        const team = await TeamApi.createTeam(apiClient, teamName.trim());

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Team created successfully");
        }

        return team;
      } catch (error) {
        console.error("❌ Failed to create team:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return createTeam;
}

/**
 * Hook for getting a team by ID
 */
export function useGetTeamById() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getTeamById = useCallback(
    async (teamId: string): Promise<TeamT> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetTeamById called:", {
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
        return await TeamApi.getTeamById(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get team:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getTeamById;
}

/**
 * Hook for getting user's teams with memberships
 */
export function useGetUserTeamsWithMemberships() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getUserTeamsWithMemberships = useCallback(async (): Promise<
    TeamWithMembership[]
  > => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 useGetUserTeamsWithMemberships called:", {
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
      return await TeamApi.getUserTeamsWithMemberships(apiClient);
    } catch (error) {
      console.error("❌ Failed to get user teams:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }, [apiClient, isAuthenticated, loading, user]);

  return getUserTeamsWithMemberships;
}

/**
 * Hook for getting team users with memberships
 */
export function useGetTeamUsersWithMemberships() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getTeamUsersWithMemberships = useCallback(
    async (teamId: string): Promise<UserWithMembership[]> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetTeamUsersWithMemberships called:", {
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
        return await TeamApi.getTeamUsersWithMemberships(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get team users:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getTeamUsersWithMemberships;
}

/**
 * Hook for updating a team
 */
export function useUpdateTeam() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateTeam = useCallback(
    async (teamId: string, teamData: TeamT): Promise<TeamT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await TeamApi.updateTeam(apiClient, teamId, teamData);
      } catch (error) {
        console.error("❌ Failed to update team:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return updateTeam;
}

/**
 * Hook for leaving a team
 */
export function useLeaveTeam() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const leaveTeam = useCallback(
    async (teamId: string): Promise<void> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        await TeamApi.leaveTeam(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to leave team:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return leaveTeam;
}

/**
 * Hook for removing a user from a team
 */
export function useRemoveUserFromTeam() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const removeUserFromTeam = useCallback(
    async (teamId: string, userId: string): Promise<void> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        await TeamApi.removeUserFromTeam(apiClient, teamId, userId);
      } catch (error) {
        console.error("❌ Failed to remove user from team:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return removeUserFromTeam;
}
