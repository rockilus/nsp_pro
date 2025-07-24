/**
 * API client for dimension operations
 */

import { DimensionT, DimensionType } from "../../../types/dimension";
import { DimEntryT } from "../../../types/dim-entry";
import { AttributeT } from "../../../types/attribute";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export interface AddDimensionResponse {
  newDimension: DimensionT;
  newDimEntries: DimEntryT[];
  newAttributes: AttributeT[];
}

export interface GetDimensionsResponse {
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
}

export class DimensionApi extends BaseApi {
  /**
   * Add a new dimension (authenticated)
   */
  static async addDimension(
    apiClient: AuthenticatedApiClient,
    dimension: DimensionT,
    dimEntries: DimEntryT[]
  ): Promise<AddDimensionResponse> {
    // Security: Input validation
    if (!dimension || !dimension.teamId) {
      throw new Error("Invalid dimension data provided");
    }
    if (!dimEntries || !Array.isArray(dimEntries)) {
      throw new Error("Invalid dimension entries provided");
    }

    const responseData = await this.makeRequest<AddDimensionResponse>(
      apiClient,
      "post",
      `/dimensions/teams/${dimension.teamId}`,
      { dimension, dim_entries: dimEntries }
    );
    return responseData;
  }

  /**
   * Get dimensions for a team (authenticated)
   */
  static async getDimensions(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    dimTypes?: DimensionType[]
  ): Promise<GetDimensionsResponse> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const queryParams = dimTypes ? `?dim_types=${dimTypes.join(",")}` : "";
    const responseData = await this.makeRequest<GetDimensionsResponse>(
      apiClient,
      "get",
      `/dimensions/teams/${teamId}${queryParams}`
    );
    return responseData;
  }

  /**
   * Update dimension (authenticated)
   */
  static async updateDimension(
    apiClient: AuthenticatedApiClient,
    updatedDimension: DimensionT
  ): Promise<DimensionT> {
    // Security: Input validation
    if (!updatedDimension || !updatedDimension.id || !updatedDimension.teamId) {
      throw new Error("Invalid dimension data provided");
    }

    const responseData = await this.makeRequest<DimensionT>(
      apiClient,
      "put",
      `/dimensions/${updatedDimension.id}/teams/${updatedDimension.teamId}`,
      updatedDimension
    );
    return responseData;
  }

  /**
   * Delete dimension (authenticated)
   */
  static async deleteDimension(
    apiClient: AuthenticatedApiClient,
    dimensionId: string,
    teamId: string
  ): Promise<void> {
    // Security: Input validation
    if (!dimensionId) {
      throw new Error("Dimension ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "delete",
      `/dimensions/${dimensionId}/teams/${teamId}`
    );
  }
}
