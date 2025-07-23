/**
 * API client for specialty operations
 */

import { SpecialtyT } from "../../../types/specialty";
import { WorkerT } from "../../../types/worker";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class SpecialtyApi extends BaseApi {
  /**
   * Add a new specialty to a team (authenticated)
   */
  static async addSpecialty(
    apiClient: AuthenticatedApiClient,
    specialty: SpecialtyT,
    teamId: string
  ): Promise<SpecialtyT> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!specialty || !specialty.name?.trim()) {
      throw new Error("Specialty name is required");
    }

    const responseData = await this.makeRequest<SpecialtyT>(
      apiClient,
      "post",
      `/specialties/teams/${teamId}`,
      specialty
    );
    return responseData;
  }

  /**
   * Get all specialties for a team (authenticated)
   */
  static async getSpecialties(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<SpecialtyT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<SpecialtyT[]>(
      apiClient,
      "get",
      `/specialties/teams/${teamId}`
    );
    return responseData;
  }

  /**
   * Update a specialty (authenticated)
   */
  static async updateSpecialty(
    apiClient: AuthenticatedApiClient,
    updatedSpecialty: SpecialtyT,
    teamId: string
  ): Promise<SpecialtyT> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!updatedSpecialty || !updatedSpecialty.id) {
      throw new Error("Valid specialty with ID is required");
    }
    if (!updatedSpecialty.name?.trim()) {
      throw new Error("Specialty name is required");
    }

    const responseData = await this.makeRequest<SpecialtyT>(
      apiClient,
      "put",
      `/specialties/${updatedSpecialty.id}/teams/${teamId}`,
      updatedSpecialty
    );
    return responseData;
  }

  /**
   * Delete a specialty (authenticated)
   */
  static async deleteSpecialty(
    apiClient: AuthenticatedApiClient,
    specialtyId: string,
    teamId: string
  ): Promise<WorkerT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!specialtyId) {
      throw new Error("Specialty ID is required");
    }

    const responseData = await this.makeRequest<WorkerT[]>(
      apiClient,
      "delete",
      `/specialties/${specialtyId}/teams/${teamId}`
    );
    return responseData;
  }

  // Legacy methods for backward compatibility (discouraged)
  static async addSpecialtyLegacy(
    specialty: SpecialtyT,
    teamId: string
  ): Promise<SpecialtyT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<SpecialtyT>(`/specialties/teams/${teamId}`, {
      method: "POST",
      body: JSON.stringify(specialty),
    });
  }

  static async getSpecialtiesLegacy(teamId: string): Promise<SpecialtyT[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<SpecialtyT[]>(`/specialties/teams/${teamId}`, {
      method: "GET",
    });
  }

  static async updateSpecialtyLegacy(
    updatedSpecialty: SpecialtyT,
    teamId: string
  ): Promise<SpecialtyT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<SpecialtyT>(
      `/specialties/${updatedSpecialty.id}/teams/${teamId}`,
      {
        method: "PUT",
        body: JSON.stringify(updatedSpecialty),
      }
    );
  }

  static async deleteSpecialtyLegacy(
    specialtyId: string,
    teamId: string
  ): Promise<WorkerT[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<WorkerT[]>(
      `/specialties/${specialtyId}/teams/${teamId}`,
      {
        method: "DELETE",
      }
    );
  }
}
