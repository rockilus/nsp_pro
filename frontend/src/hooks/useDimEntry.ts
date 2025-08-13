import { useCallback } from "react";
// Types
import { DimEntryT } from "../types/dim-entry";
import { AttributeT } from "../types/attribute";
// API Client
import { DimEntryApi } from "../app/lib/api/dimEntryApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

//////////////////////////
// Authenticated Dim Entry Hooks //
//////////////////////////

/**
 * Hook for adding a new dim entry
 */
export function useAddDimEntry() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const addDimEntry = useCallback(
    async (dimEntry: DimEntryT, teamId: string): Promise<DimEntryT> => {
      if (env.isDevelopment) {
        console.log("🔍 useAddDimEntry called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          dimEntry: dimEntry.name,
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
      if (!dimEntry || !dimEntry.name?.trim()) {
        throw new Error("Dim entry name is required");
      }

      if (!teamId) {
        throw new Error("Team ID is required");
      }

      try {
        const result = await DimEntryApi.addDimEntry(
          apiClient,
          dimEntry,
          teamId
        );

        if (env.isDevelopment) {
          console.log("✅ Dim entry added successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to add dim entry:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return addDimEntry;
}

/**
 * Hook for updating a dim entry
 */
export function useUpdateDimEntry() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateDimEntry = useCallback(
    async (updatedDimEntry: DimEntryT, teamId: string): Promise<DimEntryT> => {
      if (env.isDevelopment) {
        console.log("🔍 useUpdateDimEntry called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          dimEntryId: updatedDimEntry.id,
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
        return await DimEntryApi.updateDimEntry(
          apiClient,
          updatedDimEntry,
          teamId
        );
      } catch (error) {
        console.error("❌ Failed to update dim entry:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return updateDimEntry;
}

/**
 * Hook for deleting a dim entry
 */
export function useDeleteDimEntry() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteDimEntry = useCallback(
    async (dimEntryId: string, teamId: string): Promise<AttributeT[]> => {
      if (env.isDevelopment) {
        console.log("🔍 useDeleteDimEntry called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          dimEntryId,
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
        return await DimEntryApi.deleteDimEntry(apiClient, dimEntryId, teamId);
      } catch (error) {
        console.error("❌ Failed to delete dim entry:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return deleteDimEntry;
}
