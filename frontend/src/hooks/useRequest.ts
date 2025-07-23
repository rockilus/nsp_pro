import { useCallback } from "react";
// Types
import { RequestT } from "../types/request";
import { WorkerT } from "../types/worker";
import { ShiftT } from "../types/shift";
import { ShiftWorkerOptionT } from "../types/constraint";
// API Client
import { RequestApi } from "../app/lib/api/requestApi";
import { WorkerApi } from "../app/lib/api/workerApi";
import { ShiftApi } from "../app/lib/api/shiftApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
// Stats hooks
import { useGetShiftOptions } from "./useStats";

//////////////////////////
// Authenticated Request Hooks //
//////////////////////////

/**
 * Hook for adding a new request
 */
export function useAddRequest() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const addRequest = useCallback(
    async (request: RequestT, teamId: string): Promise<RequestT> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useAddRequest called:", {
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
      if (!request) {
        throw new Error("Request data is required");
      }

      if (!teamId || teamId.trim().length === 0) {
        throw new Error("Team ID is required");
      }

      try {
        const newRequest = await RequestApi.addRequest(
          apiClient,
          request,
          teamId.trim()
        );

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Request added successfully");
        }

        return newRequest;
      } catch (error) {
        console.error("❌ Failed to add request:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return addRequest;
}

/**
 * Hook for getting all requests for a team
 */
export function useGetRequests() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getRequests = useCallback(
    async (teamId: string): Promise<RequestT[]> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetRequests called:", {
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
        return await RequestApi.getRequests(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get requests:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getRequests;
}

/**
 * Hook for updating a request
 */
export function useUpdateRequest() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateRequest = useCallback(
    async (updatedRequest: RequestT, teamId: string): Promise<RequestT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await RequestApi.updateRequest(
          apiClient,
          updatedRequest,
          teamId
        );
      } catch (error) {
        console.error("❌ Failed to update request:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return updateRequest;
}

/**
 * Hook for accepting a request
 */
export function useAcceptRequest() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const acceptRequest = useCallback(
    async (requestId: string, teamId: string): Promise<RequestT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await RequestApi.acceptRequest(apiClient, requestId, teamId);
      } catch (error) {
        console.error("❌ Failed to accept request:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return acceptRequest;
}

/**
 * Hook for denying a request
 */
export function useDenyRequest() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const denyRequest = useCallback(
    async (requestId: string, teamId: string): Promise<RequestT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await RequestApi.denyRequest(apiClient, requestId, teamId);
      } catch (error) {
        console.error("❌ Failed to deny request:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return denyRequest;
}

/**
 * Hook for rescinding a request
 */
export function useRescindRequest() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const rescindRequest = useCallback(
    async (requestId: string, teamId: string): Promise<RequestT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await RequestApi.rescindRequest(apiClient, requestId, teamId);
      } catch (error) {
        console.error("❌ Failed to rescind request:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return rescindRequest;
}

/**
 * Hook for deleting a request
 */
export function useDeleteRequest() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteRequest = useCallback(
    async (requestId: string, teamId: string): Promise<void> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        await RequestApi.deleteRequest(apiClient, requestId, teamId);
      } catch (error) {
        console.error("❌ Failed to delete request:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return deleteRequest;
}

//////////////////////////
// Composite Data Hooks //
//////////////////////////

/**
 * Interface for requests tab data
 */
export interface RequestsTabData {
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
  shiftOptions: ShiftWorkerOptionT[];
}

/**
 * Hook for getting all requests tab data (workers, shifts, requests, shift options)
 */
export function useGetRequestsTabData() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();
  const getShiftOptions = useGetShiftOptions();

  const getRequestsTabData = useCallback(
    async (teamId: string): Promise<RequestsTabData> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetRequestsTabData called:", {
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
        // Fetch all data in parallel for better performance
        const [workers, shifts, requests, shiftOptions] = await Promise.all([
          WorkerApi.getAllWorkers(apiClient, teamId),
          ShiftApi.getAllShifts(apiClient, teamId),
          RequestApi.getRequests(apiClient, teamId),
          getShiftOptions(teamId),
        ]);

        return {
          workers,
          shifts,
          requests,
          shiftOptions,
        };
      } catch (error) {
        console.error("❌ Failed to fetch requests tab data:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user, getShiftOptions]
  );

  return getRequestsTabData;
}
