import { useCallback } from "react";
// Types
import { WorkerT } from "../types/worker";
// API Client
import { WorkerApi } from "../app/lib/api/workerApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";

//////////////////////////
// Authenticated Worker Hooks //
//////////////////////////

/**
 * Hook for adding a new worker
 */
export function useAddWorker() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const addWorker = useCallback(
    async (worker: WorkerT): Promise<WorkerT> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useAddWorker called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          workerId: worker.id,
          teamId: worker.teamId,
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
      if (!worker || !worker.teamId) {
        throw new Error("Invalid worker data provided");
      }

      try {
        const newWorker = await WorkerApi.addWorker(apiClient, worker);

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Worker added successfully");
        }

        return newWorker;
      } catch (error) {
        console.error("❌ Failed to add worker:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return addWorker;
}

/**
 * Hook for getting workers by team ID
 */
export function useGetWorkers() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getWorkers = useCallback(
    async (teamId: string): Promise<WorkerT[]> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetWorkers called:", {
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
        return await WorkerApi.getWorkers(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get workers:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getWorkers;
}

/**
 * Hook for getting all workers by team ID
 */
export function useGetAllWorkers() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getAllWorkers = useCallback(
    async (teamId: string): Promise<WorkerT[]> => {
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 useGetAllWorkers called:", {
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
        return await WorkerApi.getAllWorkers(apiClient, teamId);
      } catch (error) {
        console.error("❌ Failed to get all workers:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getAllWorkers;
}

/**
 * Hook for updating a worker
 */
export function useUpdateWorker() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateWorker = useCallback(
    async (updatedWorker: WorkerT): Promise<WorkerT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await WorkerApi.updateWorker(apiClient, updatedWorker);
      } catch (error) {
        console.error("❌ Failed to update worker:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return updateWorker;
}

/**
 * Hook for attaching a user to a worker
 */
export function useAttachUserToWorker() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const attachUserToWorker = useCallback(
    async (
      workerId: string,
      userId: string,
      teamId: string
    ): Promise<WorkerT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await WorkerApi.attachUserToWorker(
          apiClient,
          workerId,
          userId,
          teamId
        );
      } catch (error) {
        console.error("❌ Failed to attach user to worker:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return attachUserToWorker;
}

/**
 * Hook for deleting a worker
 */
export function useDeleteWorker() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteWorker = useCallback(
    async (workerId: string, teamId: string): Promise<void> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        await WorkerApi.deleteWorker(apiClient, workerId, teamId);
      } catch (error) {
        console.error("❌ Failed to delete worker:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return deleteWorker;
}

/**
 * Hook for getting workers tab data (workers, dimensions, specialties)
 */
export function useGetWorkersTabData() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getWorkersTabData = useCallback(
    async (teamId: string) => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        // Import these functions here to avoid circular dependencies
        const { getDimensions } = await import("../app/lib/dimension");
        const { getSpecialties } = await import("../app/lib/specialty");

        const workersTabData = await Promise.all([
          WorkerApi.getWorkers(apiClient, teamId),
          getDimensions(teamId),
          getSpecialties(teamId),
        ]);

        return {
          workers: workersTabData[0],
          dimensions: workersTabData[1].dimensions,
          dimEntries: workersTabData[1].dimEntries,
          specialties: workersTabData[2],
        };
      } catch (error) {
        console.error("❌ Failed to get workers tab data:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return getWorkersTabData;
}
