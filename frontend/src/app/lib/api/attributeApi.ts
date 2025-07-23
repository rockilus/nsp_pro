/**
 * API client for attribute operations
 */

import { AttributeT, toAttributeT, fromAttributeT } from "@/types/attribute";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class AttributeApi extends BaseApi {
  /**
   * Update an attribute (authenticated)
   */
  static async updateAttribute(
    apiClient: AuthenticatedApiClient,
    attribute: AttributeT,
    teamId: string
  ): Promise<AttributeT> {
    // Security: Input validation
    if (!attribute || !attribute.id) {
      throw new Error("Invalid attribute data provided");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "put",
      `/attributes/teams/${teamId}`,
      fromAttributeT(attribute)
    );
    return toAttributeT(responseData);
  }

  /**
   * Get attributes by owner (authenticated)
   */
  static async getAttributesByOwner(
    apiClient: AuthenticatedApiClient,
    ownerId: string,
    teamId: string
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
      `/attributes/teams/${teamId}/owners/${ownerId}`
    );
    return responseData.map((attr: any) => toAttributeT(attr));
  }

  /**
   * Create a new attribute (authenticated)
   */
  static async createAttribute(
    apiClient: AuthenticatedApiClient,
    attribute: Omit<AttributeT, "id">,
    teamId: string
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
      fromAttributeT({ ...attribute, id: "" }) // API will assign ID
    );
    return toAttributeT(responseData);
  }

  /**
   * Delete an attribute (authenticated)
   */
  static async deleteAttribute(
    apiClient: AuthenticatedApiClient,
    attributeId: string,
    teamId: string
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
      `/attributes/teams/${teamId}/${attributeId}`
    );
  }

  // Legacy methods for backward compatibility (discouraged)
  static async updateAttributeLegacy(
    attribute: AttributeT,
    teamId: string
  ): Promise<AttributeT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<AttributeT>(`/attributes/teams/${teamId}`, {
      method: "PUT",
      body: JSON.stringify(fromAttributeT(attribute)),
    });
  }

  static async getAttributesByOwnerLegacy(
    ownerId: string,
    teamId: string
  ): Promise<AttributeT[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any[]>(
      `/attributes/teams/${teamId}/owners/${ownerId}`
    );
    return data.map((attr: any) => toAttributeT(attr));
  }

  static async createAttributeLegacy(
    attribute: Omit<AttributeT, "id">,
    teamId: string
  ): Promise<AttributeT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any>(
      `/attributes/teams/${teamId}`,
      {
        method: "POST",
        body: JSON.stringify(fromAttributeT({ ...attribute, id: "" })),
      }
    );
    return toAttributeT(data);
  }

  static async deleteAttributeLegacy(
    attributeId: string,
    teamId: string
  ): Promise<boolean> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    try {
      await this.makeFetchRequest<void>(
        `/attributes/teams/${teamId}/${attributeId}`,
        {
          method: "DELETE",
        }
      );
      return true;
    } catch (error) {
      console.error("Legacy delete attribute failed:", error);
      return false;
    }
  }
}
