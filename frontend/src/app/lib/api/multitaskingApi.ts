/**
 * API client for multitasking operations
 */

import axios from "axios";
import {
  MultitaskingGroup,
  ShiftDemandConcurrency,
  ShiftDemandConcurrencyRequest,
  ShiftDemandConcurrencyResponse,
  CreateMultitaskingGroupRequest,
  UpdateMultitaskingGroupRequest,
} from "@/types/multitasking";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class MultitaskingApi {
  /**
   * Get all multitasking groups for a team
   */
  static async getMultitaskingGroups(
    teamId: string
  ): Promise<MultitaskingGroup[]> {
    console.log("MultitaskingApi.getMultitaskingGroups called with:", {
      teamId,
    });

    // Mock data for development
    const mockGroups: MultitaskingGroup[] = [
      {
        id: "group-1",
        teamId,
        shiftDemandIds: ["demand-1", "demand-2"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    console.log("MultitaskingApi.getMultitaskingGroups response:", mockGroups);
    return Promise.resolve(mockGroups);
  }

  /**
   * Create a new multitasking group
   */
  static async createMultitaskingGroup(
    data: CreateMultitaskingGroupRequest
  ): Promise<MultitaskingGroup> {
    console.log("MultitaskingApi.createMultitaskingGroup called with:", data);

    const mockGroup: MultitaskingGroup = {
      id: `group-${Date.now()}`,
      teamId: data.teamId,
      shiftDemandIds: data.shiftDemandIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("MultitaskingApi.createMultitaskingGroup response:", mockGroup);
    return Promise.resolve(mockGroup);
  }

  /**
   * Update an existing multitasking group
   */
  static async updateMultitaskingGroup(
    groupId: string,
    data: UpdateMultitaskingGroupRequest
  ): Promise<MultitaskingGroup> {
    console.log("MultitaskingApi.updateMultitaskingGroup called with:", {
      groupId,
      data,
    });

    const mockGroup: MultitaskingGroup = {
      id: groupId,
      teamId: "mock-team",
      shiftDemandIds: data.shiftDemandIds,
      createdAt: new Date(Date.now() - 86400000), // Yesterday
      updatedAt: new Date(),
    };

    console.log("MultitaskingApi.updateMultitaskingGroup response:", mockGroup);
    return Promise.resolve(mockGroup);
  }

  /**
   * Delete a multitasking group
   */
  static async deleteMultitaskingGroup(groupId: string): Promise<void> {
    console.log("MultitaskingApi.deleteMultitaskingGroup called with:", {
      groupId,
    });
    return Promise.resolve();
  }

  /**
   * Get concurrent shift demands for a specific shift demand
   */
  static async getConcurrentShiftDemands(
    teamId: string,
    shiftDemandId: string
  ): Promise<string[]> {
    console.log("MultitaskingApi.getConcurrentShiftDemands called with:", {
      teamId,
      shiftDemandId,
    });

    // Mock logic: return some concurrent shift demand IDs
    const mockConcurrentIds = [
      `concurrent-${shiftDemandId}-1`,
      `concurrent-${shiftDemandId}-2`,
    ];

    console.log(
      "MultitaskingApi.getConcurrentShiftDemands response:",
      mockConcurrentIds
    );
    return Promise.resolve(mockConcurrentIds);
  }

  /**
   * Get all shift demand concurrency information for a team in a period
   */
  static async getShiftDemandConcurrency(
    teamId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ShiftDemandConcurrency[]> {
    try {
      // Convert dates to Unix timestamps
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      const request: ShiftDemandConcurrencyRequest = {
        teamId,
        startDate: startTimestamp,
        endDate: endTimestamp,
      };

      console.log("MultitaskingApi.getShiftDemandConcurrency called with:", {
        teamId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        request,
      });

      const response = await axios.post<any>(
        `${API_BASE_URL}/multitasking/shift-demand-concurrency`,
        {
          teamId: request.teamId,
          startDate: request.startDate,
          endDate: request.endDate,
        }
      );

      // Response should now be in camelCase format
      const concurrencyList: ShiftDemandConcurrency[] =
        response.data.concurrencyList?.map((item: any) => ({
          shiftDemandId: item.shiftDemandId,
          concurrentShiftDemandIds: item.concurrentShiftDemandIds,
        })) || [];

      console.log(
        "MultitaskingApi.getShiftDemandConcurrency response:",
        concurrencyList
      );

      return concurrencyList;
    } catch (error) {
      console.error("Error fetching shift demand concurrency:", error);

      // Check if it's an axios error with response data
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage =
          error.response.data?.detail || "Failed to fetch concurrency data";
        throw new Error(`API Error: ${errorMessage}`);
      }

      throw new Error("Failed to fetch shift demand concurrency data");
    }
  }
}
