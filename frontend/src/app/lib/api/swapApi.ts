/**
 * API client for swap operations
 */

import { SwapRequestT, SwapStatus, toSwapRequestT, fromSwapRequestT } from '../../../types/swap';
import { SwapValidationResultT, toSwapValidationResultT } from '../../../types/swapValidation';
import { BaseApi, AuthenticatedApiClient } from './baseApi';

export class SwapApi extends BaseApi {
  /**
   * Create a new swap request
   */
  static async createSwap(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    swap: Partial<SwapRequestT>,
  ): Promise<SwapRequestT> {
    if (!teamId || !swap.offeredAssignmentIds) {
      throw new Error('Team ID and offered assignments are required');
    }

    // Send only the fields needed for creation (not the full swap object)
    const createPayload = {
      swapType: swap.swapType,
      offeredAssignmentIds: swap.offeredAssignmentIds,
      requestedAssignmentIds: swap.requestedAssignmentIds || null,
      targetWorkerId: swap.targetWorkerId || null,
      comment: swap.comment || '',
    };

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/swaps/teams/${teamId}`,
      createPayload,
    );
    return toSwapRequestT(responseData);
  }

  /**
   * Get all swap requests for a team
   */
  static async getSwapsForTeam(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    status?: SwapStatus,
  ): Promise<SwapRequestT[]> {
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    let endpoint = `/swaps/teams/${teamId}`;
    if (status) {
      endpoint += `?status=${status}`;
    }

    const responseData = await this.makeRequest<any[]>(apiClient, 'get', endpoint);
    return responseData.map(toSwapRequestT);
  }

  /**
   * Get a specific swap request by ID
   */
  static async getSwapById(
    apiClient: AuthenticatedApiClient,
    swapId: string,
  ): Promise<SwapRequestT> {
    if (!swapId) {
      throw new Error('Swap ID is required');
    }

    const responseData = await this.makeRequest<any>(apiClient, 'get', `/swaps/${swapId}`);
    return toSwapRequestT(responseData);
  }

  /**
   * Add a bid to an open swap
   */
  static async addBid(
    apiClient: AuthenticatedApiClient,
    swapId: string,
    bidderWorkerId: string,
    offeredAssignmentIds: string[],
  ): Promise<SwapRequestT> {
    if (!swapId || !bidderWorkerId || !offeredAssignmentIds?.length) {
      throw new Error('Swap ID, bidder, and offered assignments are required');
    }

    const responseData = await this.makeRequest<any>(apiClient, 'post', `/swaps/${swapId}/bids`, {
      bidderWorkerId,
      offeredAssignmentIds,
    });
    return toSwapRequestT(responseData);
  }

  /**
   * Accept a bid on an open swap (moves to PENDING_APPROVAL)
   */
  static async acceptBid(
    apiClient: AuthenticatedApiClient,
    swapId: string,
    bidId: string,
  ): Promise<SwapRequestT> {
    if (!swapId || !bidId) {
      throw new Error('Swap ID and bid ID are required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/swaps/${swapId}/accept-bid/${bidId}`,
    );
    return toSwapRequestT(responseData);
  }

  /**
   * Cancel bid acceptance, returning swap to ACTIVE status
   */
  static async cancelBidAcceptance(
    apiClient: AuthenticatedApiClient,
    swapId: string,
  ): Promise<SwapRequestT> {
    if (!swapId) {
      throw new Error('Swap ID is required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/swaps/${swapId}/cancel-bid-acceptance`,
    );
    return toSwapRequestT(responseData);
  }

  /**
   * Accept a direct swap invitation (moves to PENDING_APPROVAL)
   */
  static async acceptDirectSwap(
    apiClient: AuthenticatedApiClient,
    swapId: string,
  ): Promise<SwapRequestT> {
    if (!swapId) {
      throw new Error('Swap ID is required');
    }

    const responseData = await this.makeRequest<any>(apiClient, 'post', `/swaps/${swapId}/accept`);
    return toSwapRequestT(responseData);
  }

  /**
   * Approve a swap request (completes the swap)
   */
  static async approveSwap(
    apiClient: AuthenticatedApiClient,
    swapId: string,
  ): Promise<SwapRequestT> {
    if (!swapId) {
      throw new Error('Swap ID is required');
    }

    const responseData = await this.makeRequest<any>(apiClient, 'post', `/swaps/${swapId}/approve`);
    return toSwapRequestT(responseData);
  }

  /**
   * Deny a swap request (leader only)
   */
  static async denySwap(apiClient: AuthenticatedApiClient, swapId: string): Promise<SwapRequestT> {
    if (!swapId) {
      throw new Error('Swap ID is required');
    }

    const responseData = await this.makeRequest<any>(apiClient, 'post', `/swaps/${swapId}/deny`);
    return toSwapRequestT(responseData);
  }

  /**
   * Revert a completed swap (leader only)
   */
  static async revertSwap(
    apiClient: AuthenticatedApiClient,
    swapId: string,
  ): Promise<SwapRequestT> {
    if (!swapId) {
      throw new Error('Swap ID is required');
    }

    const responseData = await this.makeRequest<any>(apiClient, 'post', `/swaps/${swapId}/revert`);
    return toSwapRequestT(responseData);
  }

  /**
   * Validate a swap in PENDING_APPROVAL status to analyze its impact (leader only)
   */
  static async validateSwap(
    apiClient: AuthenticatedApiClient,
    swapId: string,
  ): Promise<SwapValidationResultT> {
    if (!swapId) {
      throw new Error('Swap ID is required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/swaps/${swapId}/validate`,
    );
    return toSwapValidationResultT(responseData);
  }

  /**
   * Delete a swap request
   */
  static async deleteSwap(apiClient: AuthenticatedApiClient, swapId: string): Promise<void> {
    if (!swapId) {
      throw new Error('Swap ID is required');
    }

    await this.makeRequest<void>(apiClient, 'delete', `/swaps/${swapId}`);
  }

  /**
   * Delete a bid from an open swap
   */
  static async deleteBid(
    apiClient: AuthenticatedApiClient,
    swapId: string,
    bidId: string,
  ): Promise<SwapRequestT> {
    if (!swapId || !bidId) {
      throw new Error('Swap ID and bid ID are required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'delete',
      `/swaps/${swapId}/bids/${bidId}`,
    );
    return toSwapRequestT(responseData);
  }
}
