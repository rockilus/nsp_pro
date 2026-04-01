import { useCallback } from "react";
// Types
import { LinkShiftT } from "../types/shift";
// API Client
import { LinkShiftApi } from "../app/lib/api/linkShiftApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

//////////////////////////
// Authenticated Link Shift Hooks //
//////////////////////////

/**
 * Hook for creating a new link shift
 */
export function useCreateLinkShift() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const createLinkShift = useCallback(
    async (linkShift: LinkShiftT): Promise<LinkShiftT> => {
      if (env.isDevelopment) {
        console.log("🔍 useCreateLinkShift called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId: linkShift.teamId,
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
      if (!linkShift || !linkShift.teamId) {
        throw new Error("Invalid link shift data provided");
      }

      try {
        const result = await LinkShiftApi.createLinkShift(apiClient, linkShift);

        if (env.isDevelopment) {
          console.log("✅ Link shift created successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to create link shift:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return createLinkShift;
}

/**
 * Hook for getting link shifts for a team
 */
export function useGetLinkShifts() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getLinkShifts = useCallback(
    async (teamId: string): Promise<LinkShiftT[]> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetLinkShifts called:", {
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
        return await LinkShiftApi.getLinkShifts(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get link shifts:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getLinkShifts;
}

/**
 * Hook for updating a link shift
 */
export function useUpdateLinkShift() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateLinkShift = useCallback(
    async (linkShift: LinkShiftT): Promise<LinkShiftT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await LinkShiftApi.updateLinkShift(apiClient, linkShift);
      } catch (error) {
        console.error("❌ Failed to update link shift:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return updateLinkShift;
}

/**
 * Hook for deleting a link shift
 */
export function useDeleteLinkShift() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteLinkShift = useCallback(
    async (linkShiftId: string, teamId: string): Promise<void> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        await LinkShiftApi.deleteLinkShift(apiClient, linkShiftId, teamId);
      } catch (error) {
        console.error("❌ Failed to delete link shift:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return deleteLinkShift;
}
