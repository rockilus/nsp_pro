import {
  ScheduleTemplateDTO,
  ScheduleTemplateCreateDTO,
  ScheduleTemplateUpdateDTO,
  ApplyScheduleTemplateToDateRangeDTO,
  ScheduleTemplateApplicationResult,
  SCHEDULE_TEMPLATE_CONSTRAINTS,
} from '../../../types/schedule-template';
import { BaseApi, AuthenticatedApiClient } from './baseApi';

export class ScheduleTemplateApi extends BaseApi {
  static async getTemplates(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<ScheduleTemplateDTO[]> {
    if (!teamId) {
      throw new Error('Team ID is required');
    }
    return this.makeRequest<ScheduleTemplateDTO[]>(
      apiClient,
      'get',
      `/schedule-templates/teams/${teamId}`,
    );
  }

  static async getTemplate(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string,
  ): Promise<ScheduleTemplateDTO> {
    if (!templateId || !teamId) {
      throw new Error('Template ID and Team ID are required');
    }
    return this.makeRequest<ScheduleTemplateDTO>(
      apiClient,
      'get',
      `/schedule-templates/${templateId}/teams/${teamId}`,
    );
  }

  static async createTemplate(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    template: ScheduleTemplateCreateDTO,
  ): Promise<ScheduleTemplateDTO> {
    if (!template.name || template.name.trim().length < 1) {
      throw new Error('Template name is required');
    }
    if (template.name.length > SCHEDULE_TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH) {
      throw new Error(
        `Template name cannot exceed ${SCHEDULE_TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH} characters`,
      );
    }
    return this.makeRequest<ScheduleTemplateDTO>(
      apiClient,
      'post',
      `/schedule-templates/teams/${teamId}`,
      template,
    );
  }

  static async updateTemplate(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string,
    update: ScheduleTemplateUpdateDTO,
  ): Promise<ScheduleTemplateDTO> {
    if (!templateId || !teamId) {
      throw new Error('Template ID and Team ID are required');
    }
    return this.makeRequest<ScheduleTemplateDTO>(
      apiClient,
      'put',
      `/schedule-templates/${templateId}/teams/${teamId}`,
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
      `/schedule-templates/${templateId}/teams/${teamId}`,
    );
  }

  static async applyTemplateToDateRange(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string,
    request: ApplyScheduleTemplateToDateRangeDTO,
  ): Promise<ScheduleTemplateApplicationResult> {
    if (!templateId || !teamId) {
      throw new Error('Template ID and Team ID are required');
    }
    return this.makeRequest<ScheduleTemplateApplicationResult>(
      apiClient,
      'post',
      `/schedule-templates/${templateId}/apply-to-range/teams/${teamId}`,
      request,
    );
  }
}
