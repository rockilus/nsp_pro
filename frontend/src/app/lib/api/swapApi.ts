/**
 * API client for swap operations
 */

import {
  SwapRequestT,
  SwapStatus,
  toSwapRequestT,
  fromSwapRequestT,
} from "../../../types/swap";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

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
      throw new Error("Team ID and offered assignments are required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/swaps/teams/${teamId}`,
      fromSwapRequestT(swap as SwapRequestT),
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
      throw new Error("Team ID is required");
    }

    let endpoint = `/swaps/teams/${teamId}`;
    if (status) {
      endpoint += `?status=${status}`;
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      endpoint,
    );
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
      throw new Error("Swap ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "get",
      `/swaps/${swapId}`,
    );
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
      throw new Error("Swap ID, bidder, and offered assignments are required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/swaps/${swapId}/bids`,
      {
        bidderWorkerId,
        offeredAssignmentIds,
      },
    );
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
      throw new Error("Swap ID and bid ID are required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/swaps/${swapId}/accept-bid/${bidId}`,
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
      throw new Error("Swap ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/swaps/${swapId}/accept`,
    );
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
      throw new Error("Swap ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/swaps/${swapId}/approve`,
    );
    return toSwapRequestT(responseData);
  }

  /**
   * Cancel a swap request
   */
  static async cancelSwap(
    apiClient: AuthenticatedApiClient,
    swapId: string,
  ): Promise<SwapRequestT> {
    if (!swapId) {
      throw new Error("Swap ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "delete",
      `/swaps/${swapId}`,
    );
    return toSwapRequestT(responseData);
  }
}
