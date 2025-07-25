/**
 * API client for shift demand template management
 */

import {
  ShiftDemandTemplateDTO,
  ShiftDemandTemplateCreateDTO,
  ShiftDemandTemplateUpdateDTO,
  TemplateFromDemandsDTO,
  ApplyTemplateDTO,
  ApplyDemandsToTemplateWeekDTO,
  ApplyTemplateToDateRangeDTO,
  TemplateApplicationResult,
  TemplateValidationResult,
  BatchTemplateOperationResult,
  TEMPLATE_CONSTRAINTS,
} from "../../../types/shift-demand-template";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

/**
 * Utility function to format dates for API calls
 */
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD format
};

/**
 * Client-side validation for template creation (updated for new structure)
 */
const validateTemplateCreateRequest = (
  template: ShiftDemandTemplateCreateDTO
): void => {
  if (
    !template.name ||
    template.name.trim().length < TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH
  ) {
    throw new Error(
      `Template name must be at least ${TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH} characters`
    );
  }

  if (template.name.length > TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH) {
    throw new Error(
      `Template name cannot exceed ${TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH} characters`
    );
  }

  if (
    template.description &&
    template.description.length > TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH
  ) {
    throw new Error(
      `Description cannot exceed ${TEMPLATE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters`
    );
  }

  // Note: Simplified validation since the new CreateDTO only has name and description
  // Week data validation is handled by the backend
};

/**
 * Client-side validation for template application (updated)
 */
const validateApplyTemplateRequest = (request: ApplyTemplateDTO): void => {
  const startDate = new Date(request.startDate);

  if (isNaN(startDate.getTime())) {
    throw new Error("Invalid start date provided");
  }

  // Additional validation can be added here as needed
};

/**
 * Main API client class for template operations
 */
export class ShiftDemandTemplateApi extends BaseApi {
  /**
   * Get all templates for a team (authenticated)
   */
  static async getTemplates(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<ShiftDemandTemplateDTO[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<ShiftDemandTemplateDTO[]>(
      apiClient,
      "get",
      `/shift-demand-templates/teams/${teamId}`
    );
    return responseData;
  }

  /**
   * Get a specific template by ID (authenticated)
   */
  static async getTemplate(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string
  ): Promise<ShiftDemandTemplateDTO> {
    // Security: Input validation
    if (!templateId) {
      throw new Error("Template ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<ShiftDemandTemplateDTO>(
      apiClient,
      "get",
      `/shift-demand-templates/${templateId}/teams/${teamId}`
    );
    return responseData;
  }

  /**
   * Create a new template (authenticated)
   */
  static async createTemplate(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    template: ShiftDemandTemplateCreateDTO
  ): Promise<ShiftDemandTemplateDTO> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    validateTemplateCreateRequest(template);

    const responseData = await this.makeRequest<ShiftDemandTemplateDTO>(
      apiClient,
      "post",
      `/shift-demand-templates/teams/${teamId}`,
      template
    );
    return responseData;
  }

  /**
   * Create a template from existing demands in a date range (authenticated)
   */
  static async createTemplateFromDateRange(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    template: TemplateFromDemandsDTO
  ): Promise<ShiftDemandTemplateDTO> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!template || !template.name) {
      throw new Error("Invalid template data provided");
    }

    const responseData = await this.makeRequest<ShiftDemandTemplateDTO>(
      apiClient,
      "post",
      `/shift-demand-templates/teams/${teamId}/from-demands`,
      template
    );
    return responseData;
  }

  /**
   * Update an existing template (authenticated)
   */
  static async updateTemplate(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string,
    update: ShiftDemandTemplateUpdateDTO
  ): Promise<ShiftDemandTemplateDTO> {
    // Security: Input validation
    if (!templateId) {
      throw new Error("Template ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!update) {
      throw new Error("Update data is required");
    }

    const responseData = await this.makeRequest<ShiftDemandTemplateDTO>(
      apiClient,
      "put",
      `/shift-demand-templates/${templateId}/teams/${teamId}`,
      update
    );
    return responseData;
  }

  /**
   * Delete a template (authenticated)
   */
  static async deleteTemplate(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string
  ): Promise<void> {
    // Security: Input validation
    if (!templateId) {
      throw new Error("Template ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "delete",
      `/shift-demand-templates/${templateId}/teams/${teamId}`
    );
  }

  /**
   * Apply template to a period (authenticated)
   */
  static async applyTemplate(
    apiClient: AuthenticatedApiClient,
    request: ApplyTemplateDTO
  ): Promise<TemplateApplicationResult> {
    // Security: Input validation
    validateApplyTemplateRequest(request);

    const responseData = await this.makeRequest<TemplateApplicationResult>(
      apiClient,
      "post",
      `/shift-demand-templates/apply`,
      request
    );
    return responseData;
  }

  /**
   * Validate template application without applying (authenticated)
   */
  static async validateTemplateApplication(
    apiClient: AuthenticatedApiClient,
    request: ApplyTemplateDTO
  ): Promise<TemplateValidationResult> {
    // Security: Input validation
    validateApplyTemplateRequest(request);

    const responseData = await this.makeRequest<TemplateValidationResult>(
      apiClient,
      "post",
      `/shift-demand-templates/validate`,
      request
    );
    return responseData;
  }

  /**
   * Batch delete templates (authenticated)
   */
  static async batchDeleteTemplates(
    apiClient: AuthenticatedApiClient,
    templateIds: string[]
  ): Promise<BatchTemplateOperationResult> {
    // Security: Input validation
    if (!templateIds || templateIds.length === 0) {
      throw new Error("Template IDs are required");
    }

    const responseData = await this.makeRequest<BatchTemplateOperationResult>(
      apiClient,
      "post",
      `/shift-demand-templates/batch-delete`,
      { templateIds }
    );
    return responseData;
  }

  /**
   * Get template usage analytics (authenticated)
   */
  static async getTemplateAnalytics(
    apiClient: AuthenticatedApiClient,
    templateId: string
  ): Promise<{
    usageCount: number;
    lastUsed?: string;
    averageDemandsGenerated: number;
  }> {
    // Security: Input validation
    if (!templateId) {
      throw new Error("Template ID is required");
    }

    const responseData = await this.makeRequest<{
      usageCount: number;
      lastUsed?: string;
      averageDemandsGenerated: number;
    }>(apiClient, "get", `/shift-demand-templates/${templateId}/analytics`);
    return responseData;
  }

  /**
   * Apply existing demands to template week (authenticated)
   */
  static async applyDemandsToTemplateWeek(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string,
    request: ApplyDemandsToTemplateWeekDTO
  ): Promise<ShiftDemandTemplateDTO> {
    // Security: Input validation
    if (!templateId) {
      throw new Error("Template ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!request) {
      throw new Error("Request data is required");
    }

    const responseData = await this.makeRequest<ShiftDemandTemplateDTO>(
      apiClient,
      "post",
      `/shift-demand-templates/${templateId}/apply-demands/teams/${teamId}`,
      request
    );
    return responseData;
  }

  /**
   * Apply template to a specific date range (authenticated)
   */
  static async applyTemplateToDateRange(
    apiClient: AuthenticatedApiClient,
    templateId: string,
    teamId: string,
    request: ApplyTemplateToDateRangeDTO
  ): Promise<TemplateApplicationResult> {
    // Security: Input validation
    if (!templateId) {
      throw new Error("Template ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!request) {
      throw new Error("Request data is required");
    }

    const responseData = await this.makeRequest<TemplateApplicationResult>(
      apiClient,
      "post",
      `/shift-demand-templates/${templateId}/apply-to-range/teams/${teamId}`,
      request
    );
    return responseData;
  }
}

/**
 * Utility functions for template operations
 */
export const TemplateUtils = {
  /**
   * Calculate total demands in a template
   */
  calculateTotalDemands(template: ShiftDemandTemplateDTO): number {
    return template.weeksData.reduce((totalWeekSum, week) => {
      const weekSum = week.demands.reduce(
        (sum: number, demand) => sum + demand.count,
        0
      );
      return totalWeekSum + weekSum;
    }, 0);
  },

  /**
   * Format template type for display
   */
  formatTemplateType(templateType: string): string {
    switch (templateType) {
      case "standard":
        return "Standard";
      case "even_odd":
        return "Even/Odd Week";
      default:
        return templateType;
    }
  },

  /**
   * Validate template name
   */
  validateTemplateName(name: string): { isValid: boolean; error?: string } {
    if (!name || name.trim().length < TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH) {
      return {
        isValid: false,
        error: `Name must be at least ${TEMPLATE_CONSTRAINTS.MIN_NAME_LENGTH} characters`,
      };
    }

    if (name.length > TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH) {
      return {
        isValid: false,
        error: `Name cannot exceed ${TEMPLATE_CONSTRAINTS.MAX_NAME_LENGTH} characters`,
      };
    }

    return { isValid: true };
  },

  /**
   * Create empty template week data
   */
  createEmptyWeekData(): Array<{
    shiftId: string;
    dayOfWeek: number;
    count: number;
  }> {
    return [];
  },

  /**
   * Convert Dayjs dates to API format
   */
  formatDateRangeForAPI(
    startDate: any,
    endDate: any
  ): { startDate: string; endDate: string } {
    return {
      startDate: formatDateForAPI(startDate.toDate()),
      endDate: formatDateForAPI(endDate.toDate()),
    };
  },
};
