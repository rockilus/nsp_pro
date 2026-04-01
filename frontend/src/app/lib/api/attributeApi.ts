/**
 * API client for attribute operations
 */

import { AttributeT, toAttributeT } from "@/types/attribute";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class AttributeApi extends BaseApi {
  /**
   * Update an attribute (authenticated)
   */
  static async updateAttribute(
    apiClient: AuthenticatedApiClient,
    attribute: AttributeT,
    teamId: string,
  ): Promise<AttributeT> {
    // Security: Input validation
    // if (!attribute || !attribute.id) {
    if (!attribute) {
      throw new Error("Invalid attribute data provided");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "put",
      `/attributes/teams/${teamId}`,
      attribute,
    );
    return toAttributeT(responseData);
  }

  /**
   * Get attributes by owner (authenticated)
   */
  static async getAttributesByOwner(
    apiClient: AuthenticatedApiClient,
    ownerId: string,
    teamId: string,
  ): Promise<AttributeT[]> {
    // Security: Input validation
    if (!ownerId) {
      throw new Error("Owner ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/attributes/teams/${teamId}/owners/${ownerId}`,
    );
    return responseData.map((attr: any) => toAttributeT(attr));
  }

  /**
   * Create a new attribute (authenticated)
   */
  static async createAttribute(
    apiClient: AuthenticatedApiClient,
    attribute: Omit<AttributeT, "id">,
    teamId: string,
  ): Promise<AttributeT> {
    // Security: Input validation
    if (!attribute) {
      throw new Error("Attribute data is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/attributes/teams/${teamId}`,
      { ...attribute, id: "" }, // API will assign ID
    );
    return toAttributeT(responseData);
  }

  /**
   * Delete an attribute (authenticated)
   */
  static async deleteAttribute(
    apiClient: AuthenticatedApiClient,
    attributeId: string,
    teamId: string,
  ): Promise<void> {
    // Security: Input validation
    if (!attributeId) {
      throw new Error("Attribute ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "delete",
      `/attributes/teams/${teamId}/${attributeId}`,
    );
  }
}
