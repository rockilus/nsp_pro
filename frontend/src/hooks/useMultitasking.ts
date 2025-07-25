import { useCallback } from "react";
// Types
import {
  MultitaskingGroup,
  CreateMultitaskingGroupRequest,
  UpdateMultitaskingGroupRequest,
  ShiftDemandConcurrency,
} from "../types/multitasking";
// API Client
import { MultitaskingApi } from "../app/lib/api/multitaskingApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";

//////////////////////////
// Authenticated Multitasking Hooks //
//////////////////////////

/**
 * Hook for getting multitasking groups for a team
 */
export function useGetMultitaskingGroups() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getMultitaskingGroups = useCallback(
    async (
      teamId: string,
      templateId?: string
    ): Promise<MultitaskingGroup[]> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetMultitaskingGroups called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          templateId,
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
        return await MultitaskingApi.getMultitaskingGroups(
          apiClient,
          teamId,
          templateId
        );
      } catch (error) {
        console.error("❌ Failed to get multitasking groups:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getMultitaskingGroups;
}

/**
 * Hook for creating a multitasking group
 */
export function useCreateMultitaskingGroup() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const createMultitaskingGroup = useCallback(
    async (
      data: CreateMultitaskingGroupRequest
    ): Promise<MultitaskingGroup> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useCreateMultitaskingGroup called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          data,
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
        const group = await MultitaskingApi.createMultitaskingGroup(
          apiClient,
          data
        );

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Multitasking group created successfully");
        }

        return group;
      } catch (error) {
        console.error("❌ Failed to create multitasking group:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return createMultitaskingGroup;
}

/**
 * Hook for updating a multitasking group
 */
export function useUpdateMultitaskingGroup() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateMultitaskingGroup = useCallback(
    async (
      teamId: string,
      groupId: string,
      data: UpdateMultitaskingGroupRequest
    ): Promise<MultitaskingGroup[]> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useUpdateMultitaskingGroup called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          groupId,
          data,
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
        const groups = await MultitaskingApi.updateMultitaskingGroup(
          apiClient,
          teamId,
          groupId,
          data
        );

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Multitasking group updated successfully");
        }

        return groups;
      } catch (error) {
        console.error("❌ Failed to update multitasking group:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return updateMultitaskingGroup;
}

/**
 * Hook for deleting a multitasking group
 */
export function useDeleteMultitaskingGroup() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteMultitaskingGroup = useCallback(
    async (
      teamId: string,
      groupId: string
    ): Promise<{ success: boolean; message: string }> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useDeleteMultitaskingGroup called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          groupId,
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
        const result = await MultitaskingApi.deleteMultitaskingGroup(
          apiClient,
          teamId,
          groupId
        );

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Multitasking group deleted successfully");
        }

        return result;
      } catch (error) {
        console.error("❌ Failed to delete multitasking group:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return deleteMultitaskingGroup;
}

/**
 * Hook for getting shift demand concurrency data
 */
export function useGetShiftDemandConcurrency() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getShiftDemandConcurrency = useCallback(
    async (
      teamId: string,
      startDate: Date,
      endDate: Date
    ): Promise<ShiftDemandConcurrency[]> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetShiftDemandConcurrency called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
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
        return await MultitaskingApi.getShiftDemandConcurrency(
          apiClient,
          teamId,
          startDate,
          endDate
        );
      } catch (error) {
        console.error("❌ Failed to get shift demand concurrency:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getShiftDemandConcurrency;
}
