import { useCallback } from "react";
// Types
import { SpecialtyT } from "../types/specialty";
import { WorkerT } from "../types/worker";
// API Client
import { SpecialtyApi } from "../app/lib/api/specialtyApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

//////////////////////////
// Authenticated Specialty Hooks //
//////////////////////////

/**
 * Hook for adding a new specialty to a team
 */
export function useAddSpecialty() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const addSpecialty = useCallback(
    async (specialty: SpecialtyT, teamId: string): Promise<SpecialtyT> => {
      if (env.isDevelopment) {
        console.log("🔍 useAddSpecialty called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          specialtyName: specialty.name,
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
      if (!specialty?.name?.trim()) {
        throw new Error("Specialty name is required");
      }

      if (!teamId?.trim()) {
        throw new Error("Team ID is required");
      }

      try {
        const result = await SpecialtyApi.addSpecialty(
          apiClient,
          specialty,
          teamId
        );

        if (env.isDevelopment) {
          console.log("✅ Specialty added successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to add specialty:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return addSpecialty;
}

/**
 * Hook for getting all specialties for a team
 */
export function useGetSpecialties() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getSpecialties = useCallback(
    async (teamId: string): Promise<SpecialtyT[]> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetSpecialties called:", {
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

      // Input validation
      if (!teamId?.trim()) {
        throw new Error("Team ID is required");
      }

      try {
        return await SpecialtyApi.getSpecialties(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get specialties:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getSpecialties;
}

/**
 * Hook for updating a specialty
 */
export function useUpdateSpecialty() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateSpecialty = useCallback(
    async (
      updatedSpecialty: SpecialtyT,
      teamId: string
    ): Promise<SpecialtyT> => {
      if (env.isDevelopment) {
        console.log("🔍 useUpdateSpecialty called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          specialtyId: updatedSpecialty.id,
          specialtyName: updatedSpecialty.name,
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
      if (!updatedSpecialty || !updatedSpecialty.id) {
        throw new Error("Valid specialty with ID is required");
      }

      if (!updatedSpecialty.name?.trim()) {
        throw new Error("Specialty name is required");
      }

      if (!teamId?.trim()) {
        throw new Error("Team ID is required");
      }

      try {
        const result = await SpecialtyApi.updateSpecialty(
          apiClient,
          updatedSpecialty,
          teamId
        );

        if (env.isDevelopment) {
          console.log("✅ Specialty updated successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to update specialty:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return updateSpecialty;
}

/**
 * Hook for deleting a specialty
 */
export function useDeleteSpecialty() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteSpecialty = useCallback(
    async (specialtyId: string, teamId: string): Promise<WorkerT[]> => {
      if (env.isDevelopment) {
        console.log("🔍 useDeleteSpecialty called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          specialtyId,
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
      if (!specialtyId?.trim()) {
        throw new Error("Specialty ID is required");
      }

      if (!teamId?.trim()) {
        throw new Error("Team ID is required");
      }

      try {
        const result = await SpecialtyApi.deleteSpecialty(
          apiClient,
          specialtyId,
          teamId
        );

        if (env.isDevelopment) {
          console.log("✅ Specialty deleted successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to delete specialty:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return deleteSpecialty;
}
