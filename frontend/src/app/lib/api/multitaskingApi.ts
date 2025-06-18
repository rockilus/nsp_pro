/**
 * Mock API client for multitasking operations
 * Logs all operations to console for development
 */

import {
  MultitaskingGroup,
  ShiftDemandConcurrency,
  CreateMultitaskingGroupRequest,
  UpdateMultitaskingGroupRequest,
} from "@/types/multitasking";

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
    console.log("MultitaskingApi.getShiftDemandConcurrency called with:", {
      teamId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Mock concurrency data - this would normally calculate overlapping shifts
    // For demo purposes, let's say shift demands with IDs ending in same numbers are concurrent
    const mockConcurrency: ShiftDemandConcurrency[] = [
      {
        shiftDemandId: "shift1-2024-01-01",
        concurrentShiftDemandIds: ["shift2-2024-01-01", "shift3-2024-01-01"],
      },
      {
        shiftDemandId: "shift2-2024-01-01",
        concurrentShiftDemandIds: ["shift1-2024-01-01", "shift4-2024-01-01"],
      },
      {
        shiftDemandId: "shift3-2024-01-01",
        concurrentShiftDemandIds: ["shift1-2024-01-01"],
      },
      {
        shiftDemandId: "shift4-2024-01-01",
        concurrentShiftDemandIds: ["shift2-2024-01-01"],
      },
    ];

    console.log(
      "MultitaskingApi.getShiftDemandConcurrency response:",
      mockConcurrency
    );
    return Promise.resolve(mockConcurrency);
  }
}
