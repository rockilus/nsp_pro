import { AuthenticatedApiClient } from './baseApi';
import { BaseApi } from './baseApi';
import {
  RotationT,
  RotationCreateDTO,
  RotationUpdateDTO,
  RotationBreakRequestDTO,
  toRotationT,
} from '@/types/rotation';
import { AssignmentsRecurrencesResultT, toAssignmentsRecurrencesResultT } from '@/types/assignment';

export class RotationApi extends BaseApi {
  static async getRotations(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<RotationT[]> {
    if (!teamId) throw new Error('teamId is required');
    const endpoint = `/rotations/teams/${encodeURIComponent(teamId)}`;
    const data = await this.makeRequest<any[]>(apiClient, 'get', endpoint);
    return (data || []).map(toRotationT);
  }

  static async getRotation(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    rotationId: string,
  ): Promise<RotationT> {
    if (!teamId || !rotationId) throw new Error('teamId and rotationId are required');
    const endpoint = `/rotations/${encodeURIComponent(rotationId)}/teams/${encodeURIComponent(teamId)}`;
    const data = await this.makeRequest<any>(apiClient, 'get', endpoint);
    return toRotationT(data);
  }

  static async createRotation(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    data: RotationCreateDTO,
  ): Promise<RotationT> {
    if (!teamId) throw new Error('teamId is required');
    const endpoint = `/rotations/teams/${encodeURIComponent(teamId)}`;
    const result = await this.makeRequest<any>(apiClient, 'post', endpoint, data);
    return toRotationT(result);
  }

  static async updateRotation(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    rotationId: string,
    data: RotationUpdateDTO,
  ): Promise<RotationT> {
    if (!teamId || !rotationId) throw new Error('teamId and rotationId are required');
    const endpoint = `/rotations/${encodeURIComponent(rotationId)}/teams/${encodeURIComponent(teamId)}`;
    const result = await this.makeRequest<any>(apiClient, 'put', endpoint, data);
    return toRotationT(result);
  }

  static async deleteRotation(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    rotationId: string,
  ): Promise<void> {
    if (!teamId || !rotationId) throw new Error('teamId and rotationId are required');
    const endpoint = `/rotations/${encodeURIComponent(rotationId)}/teams/${encodeURIComponent(teamId)}`;
    await this.makeRequest<void>(apiClient, 'delete', endpoint);
  }

  static async handleRotationBreak(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    assignmentId: string,
    data: RotationBreakRequestDTO,
  ): Promise<AssignmentsRecurrencesResultT> {
    if (!teamId || !assignmentId) throw new Error('teamId and assignmentId are required');
    const endpoint = `/assignments/${encodeURIComponent(assignmentId)}/rotation-break/teams/${encodeURIComponent(teamId)}`;
    const result = await this.makeRequest<any>(apiClient, 'post', endpoint, data);
    return toAssignmentsRecurrencesResultT(result);
  }
}
