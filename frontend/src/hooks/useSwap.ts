import { useCallback } from "react";
// Types
import { SwapRequestT, SwapStatus, SwapType } from "../types/swap";
// API Client
import { SwapApi } from "../app/lib/api/swapApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

//////////////////////////
// Authenticated Swap Hooks //
//////////////////////////

/**
 * Hook for getting swaps for a team
 */
export function useGetSwaps() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getSwaps = useCallback(
    async (teamId: string, status?: SwapStatus): Promise<SwapRequestT[]> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetSwaps called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          status,
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
        return await SwapApi.getSwapsForTeam(apiClient, teamId, status);
      } catch (error) {
        console.error("❌ Failed to get swaps:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getSwaps;
}

/**
 * Hook for getting a single swap by ID
 */
export function useGetSwapById() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getSwapById = useCallback(
    async (swapId: string): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log("🔍 useGetSwapById called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
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
        return await SwapApi.getSwapById(apiClient, swapId);
      } catch (error) {
        console.error("❌ Failed to get swap by id:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return getSwapById;
}

/**
 * Hook for creating a swap
 */
export function useCreateSwap() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const createSwap = useCallback(
    async (
      teamId: string,
      swapData: {
        offeredAssignmentIds: string[];
        requestedAssignmentIds: string[];
        swapType: SwapType;
        targetWorkerId: string | null;
        comment: string;
      },
    ): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log("🔍 useCreateSwap called:", {
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
        return await SwapApi.createSwap(apiClient, teamId, swapData);
      } catch (error) {
        console.error("❌ Failed to create swap:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return createSwap;
}

/**
 * Hook for adding a bid to a swap
 */
export function useAddBid() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const addBid = useCallback(
    async (
      swapId: string,
      bidderWorkerId: string,
      bidAssignmentIds: string[],
    ): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log("🔍 useAddBid called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
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
        return await SwapApi.addBid(
          apiClient,
          swapId,
          bidderWorkerId,
          bidAssignmentIds,
        );
      } catch (error) {
        console.error("❌ Failed to add bid:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return addBid;
}

/**
 * Hook for accepting a bid
 */
export function useAcceptBid() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const acceptBid = useCallback(
    async (swapId: string, bidId: string): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log("🔍 useAcceptBid called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
          bidId,
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
        return await SwapApi.acceptBid(apiClient, swapId, bidId);
      } catch (error) {
        console.error("❌ Failed to accept bid:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return acceptBid;
}

/**
 * Hook for accepting a direct swap
 */
export function useAcceptDirectSwap() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const acceptDirectSwap = useCallback(
    async (swapId: string): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log("🔍 useAcceptDirectSwap called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
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
        return await SwapApi.acceptDirectSwap(apiClient, swapId);
      } catch (error) {
        console.error("❌ Failed to accept direct swap:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return acceptDirectSwap;
}

/**
 * Hook for approving a swap (leader only)
 */
export function useApproveSwap() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const approveSwap = useCallback(
    async (swapId: string): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log("🔍 useApproveSwap called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
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
        return await SwapApi.approveSwap(apiClient, swapId);
      } catch (error) {
        console.error("❌ Failed to approve swap:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return approveSwap;
}

/**
 * Hook for cancelling a swap
 */
export function useCancelSwap() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const cancelSwap = useCallback(
    async (swapId: string): Promise<void> => {
      if (env.isDevelopment) {
        console.log("🔍 useCancelSwap called:", {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
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
        await SwapApi.cancelSwap(apiClient, swapId);
      } catch (error) {
        console.error("❌ Failed to cancel swap:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return cancelSwap;
}
