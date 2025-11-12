/**
 * API client for multitasking operations
 */
import dayjs, { Dayjs } from "dayjs";
import {
  MultitaskingGroupDTO,
  MultitaskingGroup,
  MultitaskingGroupType,
  CreateMultitaskingGroupRequest,
  UpdateMultitaskingGroupRequest,
  ShiftDemandConcurrency,
  ShiftDemandConcurrencyRequest,
  ShiftDemandConcurrencyResponse,
  toMultitaskingGroup,
} from "@/types/multitasking";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";
import { env } from "../../../config/env";

export class MultitaskingApi extends BaseApi {
  /**
   * Get all multitasking groups for a team (optionally filtered by templateId)
   */
  static async getMultitaskingGroups(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    templateId?: string
  ): Promise<MultitaskingGroup[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const params = new URLSearchParams();
    if (templateId) {
      params.append("template_id", templateId);
    }

    const endpoint = `/multitasking/teams/${teamId}/groups${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const responseData = await this.makeRequest<MultitaskingGroupDTO[]>(
      apiClient,
      "get",
      endpoint
    );

    return responseData.map((dto: MultitaskingGroupDTO) =>
      toMultitaskingGroup(dto)
    );
  }

  /**
   * Create a new multitasking group and return the created group
   */
  static async createMultitaskingGroup(
    apiClient: AuthenticatedApiClient,
    data: CreateMultitaskingGroupRequest
  ): Promise<MultitaskingGroup> {
    // Security: Input validation
    if (!data || !data.teamId) {
      throw new Error("Invalid multitasking group data provided");
    }

    const responseData = await this.makeRequest<MultitaskingGroupDTO>(
      apiClient,
      "post",
      "/multitasking/groups",
      data
    );

    return toMultitaskingGroup(responseData);
  }

  /**
   * Update an existing multitasking group and return all groups for the team
   */
  static async updateMultitaskingGroup(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    groupId: string,
    data: UpdateMultitaskingGroupRequest
  ): Promise<MultitaskingGroup[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!groupId) {
      throw new Error("Group ID is required");
    }
    if (!data) {
      throw new Error("Invalid update data provided");
    }

    const responseData = await this.makeRequest<MultitaskingGroupDTO[]>(
      apiClient,
      "put",
      `/multitasking/teams/${teamId}/groups/${groupId}`,
      data
    );

    return responseData.map((dto: MultitaskingGroupDTO) =>
      toMultitaskingGroup(dto)
    );
  }

  /**
   * Delete a multitasking group and return confirmation
   */
  static async deleteMultitaskingGroup(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    groupId: string
  ): Promise<{ success: boolean; message: string }> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!groupId) {
      throw new Error("Group ID is required");
    }

    const responseData = await this.makeRequest<{
      success: boolean;
      message: string;
    }>(apiClient, "delete", `/multitasking/teams/${teamId}/groups/${groupId}`);

    return responseData;
  }

  /**
   * Get all shift demand concurrency information for a team in a period
   */
  static async getShiftDemandConcurrency(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    startDate: Dayjs,
    endDate: Dayjs
  ): Promise<ShiftDemandConcurrency[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }
    if (!startDate.isBefore(endDate)) {
      throw new Error("Start date must be before end date");
    }

    try {
      // Convert dates to Unix timestamps (seconds)
      const startTimestamp = startDate.unix();
      const endTimestamp = endDate.unix();

      const requestData: ShiftDemandConcurrencyRequest = {
        teamId,
        startDate: startTimestamp,
        endDate: endTimestamp,
      };

      if (env.isDevelopment) {
        console.log("MultitaskingApi.getShiftDemandConcurrency called with:", {
          teamId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          requestData,
        });
      }

      const responseData = await this.makeRequest<{
        concurrencyList: Array<{
          shiftDemandId: string;
          concurrentShiftDemandIds: string[];
        }>;
      }>(apiClient, "post", "/multitasking/shift-demand-concurrency", {
        teamId: requestData.teamId,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
      });

      // Response should now be in camelCase format
      const concurrencyList: ShiftDemandConcurrency[] =
        responseData.concurrencyList?.map((item: any) => ({
          shiftDemandId: item.shiftDemandId,
          concurrentShiftDemandIds: item.concurrentShiftDemandIds,
        })) || [];

      if (env.isDevelopment) {
        console.log(
          "MultitaskingApi.getShiftDemandConcurrency response:",
          concurrencyList
        );
      }

      return concurrencyList;
    } catch (error) {
      console.error("❌ Failed to fetch shift demand concurrency:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}
