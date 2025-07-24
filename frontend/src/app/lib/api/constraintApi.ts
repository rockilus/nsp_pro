/**
 * API client for constraint operations
 */

import { ConstraintT, TemplateT } from "../../../types/constraint";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class ConstraintApi extends BaseApi {
  /**
   * Add a new constraint (authenticated)
   */
  static async addConstraint(
    apiClient: AuthenticatedApiClient,
    constraint: ConstraintT
  ): Promise<ConstraintT> {
    // Security: Input validation
    if (!constraint || !constraint.teamId) {
      throw new Error("Invalid constraint data provided");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/constraints/teams/${constraint.teamId}`,
      constraint
    );
    return responseData as ConstraintT;
  }

  /**
   * Get constraints by team ID (authenticated)
   */
  static async getConstraints(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<ConstraintT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/constraints/teams/${teamId}`
    );
    return responseData as ConstraintT[];
  }

  /**
   * Update constraint (authenticated)
   */
  static async updateConstraint(
    apiClient: AuthenticatedApiClient,
    updatedConstraint: ConstraintT
  ): Promise<ConstraintT> {
    // Security: Input validation
    if (
      !updatedConstraint ||
      !updatedConstraint.id ||
      !updatedConstraint.teamId
    ) {
      throw new Error("Invalid constraint data provided");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "put",
      `/constraints/${updatedConstraint.id}/teams/${updatedConstraint.teamId}`,
      updatedConstraint
    );
    return responseData as ConstraintT;
  }

  /**
   * Delete constraint (authenticated)
   */
  static async deleteConstraint(
    apiClient: AuthenticatedApiClient,
    constraintId: string,
    teamId: string
  ): Promise<void> {
    // Security: Input validation
    if (!constraintId) {
      throw new Error("Constraint ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "delete",
      `/constraints/${constraintId}/teams/${teamId}`
    );
  }

  /**
   * Get constraint templates by team ID (authenticated)
   */
  static async getTemplates(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<TemplateT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/constraint-templates/teams/${teamId}`
    );
    return responseData as TemplateT[];
  }

  // Legacy methods for backward compatibility (discouraged)
  static async addConstraintLegacy(
    constraint: ConstraintT
  ): Promise<ConstraintT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<ConstraintT>(
      `/constraints/teams/${constraint.teamId}`,
      {
        method: "POST",
        body: JSON.stringify(constraint),
      }
    );
  }

  static async getConstraintsLegacy(teamId: string): Promise<ConstraintT[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<ConstraintT[]>(`/constraints/teams/${teamId}`);
  }

  static async updateConstraintLegacy(
    updatedConstraint: ConstraintT
  ): Promise<ConstraintT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<ConstraintT>(
      `/constraints/${updatedConstraint.id}/teams/${updatedConstraint.teamId}`,
      {
        method: "PUT",
        body: JSON.stringify(updatedConstraint),
      }
    );
  }

  static async deleteConstraintLegacy(
    constraintId: string,
    teamId: string
  ): Promise<void> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    await this.makeFetchRequest<void>(
      `/constraints/${constraintId}/teams/${teamId}`,
      {
        method: "DELETE",
      }
    );
  }

  static async getTemplatesLegacy(teamId: string): Promise<TemplateT[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<TemplateT[]>(
      `/constraint-templates/teams/${teamId}`
    );
  }
}
