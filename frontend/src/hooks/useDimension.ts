import { useCallback } from "react";
// Types
import { DimensionT, DimensionType } from "../types/dimension";
import { DimEntryT } from "../types/dim-entry";
// API Client
import {
  DimensionApi,
  AddDimensionResponse,
  GetDimensionsResponse,
} from "../app/lib/api/dimensionApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

//////////////////////////
// Authenticated Dimension Hooks //
//////////////////////////

/**
 * Hook for adding a new dimension
 */
export function useAddDimension() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const addDimension = useCallback(
    async (
      dimension: DimensionT,
      dimEntries: DimEntryT[],
    ): Promise<AddDimensionResponse> => {
      if (env.isDevelopment) {
        console.log("🔍 useAddDimension called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId: dimension.teamId,
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
      if (!dimension || !dimension.teamId) {
        throw new Error("Invalid dimension data provided");
      }
      if (!dimEntries || !Array.isArray(dimEntries)) {
        throw new Error("Invalid dimension entries provided");
      }

      try {
        const result = await DimensionApi.addDimension(
          apiClient,
          dimension,
          dimEntries,
        );

        if (env.isDevelopment) {
          console.log("✅ Dimension added successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to add dimension:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return addDimension;
}

/**
 * Hook for getting dimensions
 */
export function useGetDimensions() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getDimensions = useCallback(
    async (
      teamId: string,
      dimTypes?: DimensionType[],
    ): Promise<GetDimensionsResponse> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetDimensions called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          dimTypes,
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
        return await DimensionApi.getDimensions(apiClient, teamId, dimTypes);
      } catch (error) {
        console.error("❌ Failed to get dimensions:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getDimensions;
}

/**
 * Hook for updating a dimension
 */
export function useUpdateDimension() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateDimension = useCallback(
    async (updatedDimension: DimensionT): Promise<DimensionT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await DimensionApi.updateDimension(apiClient, updatedDimension);
      } catch (error) {
        console.error("❌ Failed to update dimension:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return updateDimension;
}

/**
 * Hook for deleting a dimension
 */
export function useDeleteDimension() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteDimension = useCallback(
    async (dimensionId: string, teamId: string): Promise<void> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        await DimensionApi.deleteDimension(apiClient, dimensionId, teamId);
      } catch (error) {
        console.error("❌ Failed to delete dimension:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return deleteDimension;
}
