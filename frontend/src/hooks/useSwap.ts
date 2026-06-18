import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
// Types
import { SwapRequestT, SwapStatus, SwapType } from '../types/swap';
import { SwapValidationResultT } from '../types/swapValidation';
// API Client
import { SwapApi } from '../app/lib/api/swapApi';
import { useApiClient } from '../app/lib/api-client';
// Auth Context
import { useAuth } from '../contexts/auth-context';
import { env } from '@/config/env';
import { assignmentsQueryKeys } from '../app/lib/hooks/useAssignments';

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
        console.log('🔍 useGetSwaps called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
          status,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await SwapApi.getSwapsForTeam(apiClient, teamId, status);
      } catch (error) {
        console.error('❌ Failed to get swaps:', {
          error: error instanceof Error ? error.message : 'Unknown error',
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
        console.log('🔍 useGetSwapById called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await SwapApi.getSwapById(apiClient, swapId);
      } catch (error) {
        console.error('❌ Failed to get swap by id:', {
          error: error instanceof Error ? error.message : 'Unknown error',
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
        requestedAssignmentIds: string[] | null;
        swapType: SwapType;
        targetWorkerId: string | null;
        comment: string;
      },
    ): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log('🔍 useCreateSwap called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          teamId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await SwapApi.createSwap(apiClient, teamId, swapData);
      } catch (error) {
        console.error('❌ Failed to create swap:', {
          error: error instanceof Error ? error.message : 'Unknown error',
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
        console.log('🔍 useAddBid called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await SwapApi.addBid(apiClient, swapId, bidderWorkerId, bidAssignmentIds);
      } catch (error) {
        console.error('❌ Failed to add bid:', {
          error: error instanceof Error ? error.message : 'Unknown error',
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
        console.log('🔍 useAcceptBid called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
          bidId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await SwapApi.acceptBid(apiClient, swapId, bidId);
      } catch (error) {
        console.error('❌ Failed to accept bid:', {
          error: error instanceof Error ? error.message : 'Unknown error',
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
 * Hook for canceling bid acceptance
 */
export function useCancelBidAcceptance() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const cancelBidAcceptance = useCallback(
    async (swapId: string): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log('🔍 useCancelBidAcceptance called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await SwapApi.cancelBidAcceptance(apiClient, swapId);
      } catch (error) {
        console.error('❌ Failed to cancel bid acceptance:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return cancelBidAcceptance;
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
        console.log('🔍 useAcceptDirectSwap called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await SwapApi.acceptDirectSwap(apiClient, swapId);
      } catch (error) {
        console.error('❌ Failed to accept direct swap:', {
          error: error instanceof Error ? error.message : 'Unknown error',
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
  const queryClient = useQueryClient();

  const approveSwap = useCallback(
    async (swapId: string): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log('🔍 useApproveSwap called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        const result = await SwapApi.approveSwap(apiClient, swapId);

        // Invalidate assignment cache since approval modifies assignments
        queryClient.invalidateQueries({
          queryKey: assignmentsQueryKeys.all,
        });

        return result;
      } catch (error) {
        console.error('❌ Failed to approve swap:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user, queryClient],
  );

  return approveSwap;
}

/**
 * Hook for cancelling a swap
 */
export function useDeleteSwap() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteSwap = useCallback(
    async (swapId: string): Promise<void> => {
      if (env.isDevelopment) {
        console.log('🔍 useDeleteSwap called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        await SwapApi.deleteSwap(apiClient, swapId);
      } catch (error) {
        console.error('❌ Failed to delete swap:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return deleteSwap;
}

/**
 * Hook for denying a swap (leader only)
 */
export function useDenySwap() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const denySwap = useCallback(
    async (swapId: string): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log('🔍 useDenySwap called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await SwapApi.denySwap(apiClient, swapId);
      } catch (error) {
        console.error('❌ Failed to deny swap:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return denySwap;
}

/**
 * Hook for reverting a completed swap (leader only)
 */
export function useRevertSwap() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();
  const queryClient = useQueryClient();

  const revertSwap = useCallback(
    async (swapId: string): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log('🔍 useRevertSwap called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        const result = await SwapApi.revertSwap(apiClient, swapId);

        // Invalidate assignment cache since revert modifies assignments
        queryClient.invalidateQueries({
          queryKey: assignmentsQueryKeys.all,
        });

        return result;
      } catch (error) {
        console.error('❌ Failed to revert swap:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user, queryClient],
  );

  return revertSwap;
}

/**
 * Hook for validating a swap in PENDING_APPROVAL status (leader only)
 */
export function useValidateSwap() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const validateSwap = useCallback(
    async (swapId: string): Promise<SwapValidationResultT> => {
      if (env.isDevelopment) {
        console.log('🔍 useValidateSwap called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await SwapApi.validateSwap(apiClient, swapId);
      } catch (error) {
        console.error('❌ Failed to validate swap:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return validateSwap;
}

/**
 * Hook for deleting a bid from an open swap
 */
export function useDeleteBid() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const deleteBid = useCallback(
    async (swapId: string, bidId: string): Promise<SwapRequestT> => {
      if (env.isDevelopment) {
        console.log('🔍 useDeleteBid called:', {
          timestamp: new Date().toISOString(),
          isAuthenticated,
          hasUser: !!user,
          swapId,
          bidId,
        });
      }

      // Security: Validate authentication state
      if (loading) {
        throw new Error('Authentication still loading - please wait');
      }

      if (!isAuthenticated) {
        throw new Error('User not authenticated - please sign in');
      }

      try {
        return await SwapApi.deleteBid(apiClient, swapId, bidId);
      } catch (error) {
        console.error('❌ Failed to delete bid:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user],
  );

  return deleteBid;
}
