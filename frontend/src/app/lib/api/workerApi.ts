/**
 * API client for worker operations
 */

import { WorkerT, toWorkerT, fromWorkerT } from "../../../types/worker";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";
export class WorkerApi extends BaseApi {
  // Conversion functions are provided from the shared type module

  /**
   * Add a new worker (authenticated)
   */
  static async addWorker(
    apiClient: AuthenticatedApiClient,
    worker: WorkerT
  ): Promise<WorkerT> {
    // Security: Input validation
    if (!worker || !worker.teamId) {
      throw new Error("Invalid worker data provided");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/workers/teams/${worker.teamId}`,
      fromWorkerT(worker)
    );
    return toWorkerT(responseData);
  }

  /**
   * Get workers by team ID (authenticated)
   */
  static async getWorkers(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<WorkerT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/workers/teams/${teamId}`
    );
    return responseData.map((worker: any) => toWorkerT(worker));
  }

  /**
   * Get all workers by team ID (authenticated)
   */
  static async getAllWorkers(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<WorkerT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/workers/all/teams/${teamId}`
    );
    return responseData.map((worker: any) => toWorkerT(worker));
  }

  /**
   * Update worker (authenticated)
   */
  static async updateWorker(
    apiClient: AuthenticatedApiClient,
    updatedWorker: WorkerT
  ): Promise<WorkerT> {
    // Security: Input validation
    if (!updatedWorker || !updatedWorker.id || !updatedWorker.teamId) {
      throw new Error("Invalid worker data provided");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "put",
      `/workers/${updatedWorker.id}/teams/${updatedWorker.teamId}`,
      fromWorkerT(updatedWorker)
    );
    return toWorkerT(responseData);
  }

  /**
   * Attach user to worker (authenticated)
   */
  static async attachUserToWorker(
    apiClient: AuthenticatedApiClient,
    workerId: string,
    userId: string,
    teamId: string
  ): Promise<WorkerT> {
    // Security: Input validation
    if (!workerId) {
      throw new Error("Worker ID is required");
    }
    if (!userId) {
      throw new Error("User ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/workers/${workerId}/attach_user/teams/${teamId}`,
      { user_id: userId }
    );
    return toWorkerT(responseData);
  }

  /**
   * Delete worker (authenticated)
   */
  static async deleteWorker(
    apiClient: AuthenticatedApiClient,
    workerId: string,
    teamId: string
  ): Promise<void> {
    // Security: Input validation
    if (!workerId) {
      throw new Error("Worker ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "delete",
      `/workers/${workerId}/teams/${teamId}`
    );
  }
}
