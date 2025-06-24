/**
 * API client for multitasking operations
 */

import axios from "axios";
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class MultitaskingApi {
  /**
   * Get all multitasking groups for a team (optionally filtered by templateId)
   */
  static async getMultitaskingGroups(
    teamId: string,
    templateId?: string
  ): Promise<MultitaskingGroup[]> {
    const url = new URL(`${API_BASE_URL}/multitasking/teams/${teamId}/groups`);
    if (templateId) url.searchParams.append("template_id", templateId);
    const res = await fetch(url.toString(), {
      credentials: "include",
    });
    if (!res.ok)
      throw new Error(`Failed to fetch multitasking groups: ${res.status}`);
    const data: MultitaskingGroupDTO[] = await res.json();
    return data.map(toMultitaskingGroup);
  }

  /**
   * Create a new multitasking group and return the created group
   */
  static async createMultitaskingGroup(
    data: CreateMultitaskingGroupRequest
  ): Promise<MultitaskingGroup> {
    const res = await fetch(`${API_BASE_URL}/multitasking/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok)
      throw new Error(`Failed to create multitasking group: ${res.status}`);
    const dto: MultitaskingGroupDTO = await res.json();
    return toMultitaskingGroup(dto);
  }

  /**
   * Update an existing multitasking group and return all groups for the team
   */
  static async updateMultitaskingGroup(
    teamId: string,
    groupId: string,
    data: UpdateMultitaskingGroupRequest
  ): Promise<MultitaskingGroup[]> {
    const res = await fetch(
      `${API_BASE_URL}/multitasking/teams/${teamId}/groups/${groupId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );
    if (!res.ok)
      throw new Error(`Failed to update multitasking group: ${res.status}`);
    const dtos: MultitaskingGroupDTO[] = await res.json();
    return dtos.map(toMultitaskingGroup);
  }

  /**
   * Delete a multitasking group and return confirmation
   */
  static async deleteMultitaskingGroup(
    teamId: string,
    groupId: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(
      `${API_BASE_URL}/multitasking/teams/${teamId}/groups/${groupId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    if (!res.ok)
      throw new Error(`Failed to delete multitasking group: ${res.status}`);
    return res.json();
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
