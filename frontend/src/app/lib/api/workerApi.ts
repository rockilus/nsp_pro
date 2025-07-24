/**
 * API client for worker operations
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { WorkerT } from "../../../types/worker";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

dayjs.extend(utc);

export class WorkerApi extends BaseApi {
  /**
   * Transform API response data to WorkerT
   */
  private static toWorkerT(data: any): WorkerT {
    return {
      ...data,
      employmentStartDate: dayjs.unix(data.employmentStartDate).utc(),
      employmentEndDate: data.employmentEndDate
        ? dayjs.unix(data.employmentEndDate).utc()
        : null,
    };
  }

  /**
   * Transform WorkerT to API request data
   */
  private static fromWorkerT(data: WorkerT): any {
    return {
      ...data,
      employmentStartDate: data.employmentStartDate.unix(),
      employmentEndDate: data.employmentEndDate
        ? data.employmentEndDate.unix()
        : null,
    };
  }

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
      this.fromWorkerT(worker)
    );
    return this.toWorkerT(responseData);
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
    return responseData.map((worker: any) => this.toWorkerT(worker));
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
    return responseData.map((worker: any) => this.toWorkerT(worker));
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
      this.fromWorkerT(updatedWorker)
    );
    return this.toWorkerT(responseData);
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
    return this.toWorkerT(responseData);
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
