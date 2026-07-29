import {
  AssignmentTemplateDTO,
  AssignmentTemplateCreateDTO,
  AssignmentTemplateUpdateDTO,
  ApplyAssignmentsToTemplateWeekDTO,
  ApplyAssignmentTemplateToDateRangeDTO,
  AssignmentTemplateApplicationResult,
  ASSIGNMENT_TEMPLATE_CONSTRAINTS,
} from '../../../types/assignment-template';
import { BaseApi, AuthenticatedApiClient } from './baseApi';

export class AssignmentTemplateApi extends BaseApi {
  static async getTemplates(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<AssignmentTemplateDTO[]> {
    if (!teamId) {
      throw new Error('Team ID is required');
    }
    return this.makeRequest<AssignmentTemplateDTO[]>(
      apiClient,
      'get',
      `/assignment-templates/teams/${teamId}`,
    );
  }

  static async getTemplate(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string,
  ): Promise<AssignmentTemplateDTO> {
    if (!templateId || !teamId) {
      throw new Error('Template ID and Team ID are required');
    }
    return this.makeRequest<AssignmentTemplateDTO>(
      apiClient,
      'get',
      `/assignment-templates/${templateId}/teams/${teamId}`,
    );
  }

  static async createTemplate(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    template: AssignmentTemplateCreateDTO,
  ): Promise<AssignmentTemplateDTO> {
    if (!template.name || template.name.trim().length < 1) {
      throw new Error('Template name is required');
    }
    if (template.name.length > ASSIGNMENT_TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH) {
      throw new Error(
        `Template name cannot exceed ${ASSIGNMENT_TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH} characters`,
      );
    }
    return this.makeRequest<AssignmentTemplateDTO>(
      apiClient,
      'post',
      `/assignment-templates/teams/${teamId}`,
      template,
    );
  }

  static async updateTemplate(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string,
    update: AssignmentTemplateUpdateDTO,
  ): Promise<AssignmentTemplateDTO> {
    if (!templateId || !teamId) {
      throw new Error('Template ID and Team ID are required');
    }
    return this.makeRequest<AssignmentTemplateDTO>(
      apiClient,
      'put',
      `/assignment-templates/${templateId}/teams/${teamId}`,
      update,
    );
  }

  static async deleteTemplate(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string,
  ): Promise<void> {
    if (!templateId || !teamId) {
      throw new Error('Template ID and Team ID are required');
    }
    return this.makeRequest<void>(
      apiClient,
      'delete',
      `/assignment-templates/${templateId}/teams/${teamId}`,
    );
  }

  static async applyAssignmentsToTemplateWeek(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string,
    request: ApplyAssignmentsToTemplateWeekDTO,
  ): Promise<AssignmentTemplateDTO> {
    if (!templateId || !teamId) {
      throw new Error('Template ID and Team ID are required');
    }
    return this.makeRequest<AssignmentTemplateDTO>(
      apiClient,
      'post',
      `/assignment-templates/${templateId}/apply-assignments/teams/${teamId}`,
      request,
    );
  }

  static async applyTemplateToDateRange(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string,
    request: ApplyAssignmentTemplateToDateRangeDTO,
  ): Promise<AssignmentTemplateApplicationResult> {
    if (!templateId || !teamId) {
      throw new Error('Template ID and Team ID are required');
    }
    return this.makeRequest<AssignmentTemplateApplicationResult>(
      apiClient,
      'post',
      `/assignment-templates/${templateId}/apply-to-range/teams/${teamId}`,
      request,
    );
  }
}
