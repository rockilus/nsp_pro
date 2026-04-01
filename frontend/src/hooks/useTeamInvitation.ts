import { useCallback } from "react";
// Types
import {
  TeamInvitationT,
  EnrichedTeamInvitationT,
} from "../types/team-invitation";
import { TeamWithMembership } from "../types/team";
// API Client
import { TeamInvitationApi } from "../app/lib/api/teamInvitationApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

//////////////////////////
// Authenticated Team Invitation Hooks //
//////////////////////////

/**
 * Hook for creating a new team invitation
 */
export function useCreateTeamInvitation() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const createTeamInvitation = useCallback(
    async (
      invitation: TeamInvitationT,
      teamId: string,
    ): Promise<TeamInvitationT> => {
      if (env.isDevelopment) {
        console.log("🔍 useCreateTeamInvitation called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          email: invitation.email,
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
      if (!invitation || !invitation.email) {
        throw new Error("Invitation data is required");
      }

      if (!teamId) {
        throw new Error("Team ID is required");
      }

      try {
        const result = await TeamInvitationApi.createTeamInvitation(
          apiClient,
          invitation,
          teamId,
        );

        if (env.isDevelopment) {
          console.log("✅ Team invitation created successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to create team invitation:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return createTeamInvitation;
}

/**
 * Hook for getting team invitations
 */
export function useGetTeamInvitations() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getTeamInvitations = useCallback(
    async (teamId: string): Promise<TeamInvitationT[]> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetTeamInvitations called:", {
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
        return await TeamInvitationApi.getTeamInvitations(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get team invitations:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getTeamInvitations;
}

/**
 * Hook for getting user's pending invitations
 */
export function useGetUserPendingInvitations() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getUserPendingInvitations = useCallback(async (): Promise<
    EnrichedTeamInvitationT[]
  > => {
    if (env.isDevelopment) {
      console.log("🔍 useGetUserPendingInvitations called:", {
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
      return await TeamInvitationApi.getUserPendingInvitations(apiClient);
    } catch (error) {
      console.error("❌ Failed to get pending invitations:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }, [apiClient, isAuthenticated, loading, user]);

  return getUserPendingInvitations;
}

/**
 * Hook for accepting a team invitation
 */
export function useAcceptTeamInvitation() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const acceptTeamInvitation = useCallback(
    async (token: string): Promise<TeamWithMembership> => {
      if (env.isDevelopment) {
        console.log("🔍 useAcceptTeamInvitation called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          hasToken: !!token,
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
      if (!token) {
        throw new Error("Invitation token is required");
      }

      try {
        const result = await TeamInvitationApi.acceptTeamInvitation(
          apiClient,
          token,
        );

        if (env.isDevelopment) {
          console.log("✅ Team invitation accepted successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to accept team invitation:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return acceptTeamInvitation;
}

/**
 * Hook for rejecting a team invitation
 */
export function useRejectTeamInvitation() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const rejectTeamInvitation = useCallback(
    async (token: string): Promise<void> => {
      if (env.isDevelopment) {
        console.log("🔍 useRejectTeamInvitation called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          hasToken: !!token,
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
      if (!token) {
        throw new Error("Invitation token is required");
      }

      try {
        await TeamInvitationApi.rejectTeamInvitation(apiClient, token);

        if (env.isDevelopment) {
          console.log("✅ Team invitation rejected successfully");
        }
      } catch (error) {
        console.error("❌ Failed to reject team invitation:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return rejectTeamInvitation;
}

/**
 * Hook for resending team invitation email
 */
export function useResendTeamInvitationEmail() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const resendTeamInvitationEmail = useCallback(
    async (invitationId: string, teamId: string): Promise<TeamInvitationT> => {
      if (env.isDevelopment) {
        console.log("🔍 useResendTeamInvitationEmail called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          invitationId,
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
        const result = await TeamInvitationApi.resendTeamInvitationEmail(
          apiClient,
          invitationId,
          teamId,
        );

        if (env.isDevelopment) {
          console.log("✅ Team invitation email resent successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to resend team invitation email:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return resendTeamInvitationEmail;
}

/**
 * Hook for deleting a team invitation
 */
export function useDeleteTeamInvitation() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteTeamInvitation = useCallback(
    async (
      invitationId: string,
      teamId: string,
    ): Promise<{ message: string }> => {
      if (env.isDevelopment) {
        console.log("🔍 useDeleteTeamInvitation called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          invitationId,
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
        const result = await TeamInvitationApi.deleteTeamInvitation(
          apiClient,
          invitationId,
          teamId,
        );

        if (env.isDevelopment) {
          console.log("✅ Team invitation deleted successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to delete team invitation:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return deleteTeamInvitation;
}
