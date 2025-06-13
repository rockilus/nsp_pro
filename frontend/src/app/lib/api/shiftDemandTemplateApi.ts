/**
 * API client for shift demand template management
 * Updated to match new backend DTO structure
 */

import {
  ShiftDemandTemplateDTO,
  ShiftDemandTemplateCreateDTO,
  ShiftDemandTemplateUpdateDTO,
  TemplateFromDemandsDTO,
  ApplyTemplateDTO,
  TemplateApplicationResult,
  TemplateValidationResult,
  BatchTemplateOperationResult,
  TemplateErrorResponse,
  TEMPLATE_CONSTRAINTS,
} from "@/types/shift-demand-template";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TEMPLATES_BASE = `${API_BASE_URL}/shift-demand-templates`;

/**
 * Utility function to format dates for API calls
 */
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD format
};

/**
 * Enhanced error handler for template API responses
 */
const handleTemplateAPIError = async (response: Response): Promise<never> => {
  try {
    const errorData: TemplateErrorResponse = await response.json();

    // Create user-friendly error message based on error type
    let userMessage = errorData.message || "An unexpected error occurred";

    switch (errorData.error) {
      case "validation_error":
        userMessage = `Validation failed: ${errorData.message}`;
        break;
      case "template_not_found":
        userMessage = "Template not found";
        break;
      case "authorization_error":
        userMessage = "You don't have permission to perform this action";
        break;
      case "duplicate_name":
        userMessage = "A template with this name already exists";
        break;
      case "template_limit_exceeded":
        userMessage = `Cannot create more than ${TEMPLATE_CONSTRAINTS.MAX_TEMPLATES_PER_TEAM} templates`;
        break;
      case "invalid_date_range":
        userMessage = "Invalid date range provided";
        break;
      case "internal_error":
      default:
        userMessage = "A server error occurred. Please try again later.";
        break;
    }

    throw new Error(userMessage);
  } catch (parseError) {
    // Fallback if response is not JSON
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
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
 * Main API client class for template operations (updated)
 */
export class ShiftDemandTemplateApi {
  /**
   * Get all templates for a team (updated endpoint)
   */
  static async getTemplates(teamId: string): Promise<ShiftDemandTemplateDTO[]> {
    const response = await fetch(`${TEMPLATES_BASE}/teams/${teamId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
  }

  /**
   * Get a specific template by ID (updated endpoint)
   */
  static async getTemplate(
    templateId: string,
    teamId: string
  ): Promise<ShiftDemandTemplateDTO> {
    const response = await fetch(
      `${TEMPLATES_BASE}/${templateId}/teams/${teamId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
  }

  /**
   * Create a new template (simplified for new DTO structure)
   */
  static async createTemplate(
    teamId: string,
    template: ShiftDemandTemplateCreateDTO
  ): Promise<ShiftDemandTemplateDTO> {
    validateTemplateCreateRequest(template);

    const response = await fetch(`${TEMPLATES_BASE}/teams/${teamId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(template),
    });

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
  }

  /**
   * Create a template from existing demands in a date range
   */
  static async createTemplateFromDateRange(
    teamId: string,
    template: TemplateFromDemandsDTO
  ): Promise<ShiftDemandTemplateDTO> {
    const response = await fetch(
      `${TEMPLATES_BASE}/teams/${teamId}/from-demands`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(template),
      }
    );

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
  }

  /**
   * Update an existing template (updated endpoint)
   */
  static async updateTemplate(
    templateId: string,
    teamId: string,
    update: ShiftDemandTemplateUpdateDTO
  ): Promise<ShiftDemandTemplateDTO> {
    const response = await fetch(
      `${TEMPLATES_BASE}/${templateId}/teams/${teamId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(update),
      }
    );

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
  }

  /**
   * Delete a template (updated endpoint)
   */
  static async deleteTemplate(
    templateId: string,
    teamId: string
  ): Promise<void> {
    const response = await fetch(
      `${TEMPLATES_BASE}/${templateId}/teams/${teamId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }
  }

  /**
   * Apply template to a period
   */
  static async applyTemplate(
    request: ApplyTemplateDTO
  ): Promise<TemplateApplicationResult> {
    validateApplyTemplateRequest(request);

    const response = await fetch(`${TEMPLATES_BASE}/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
  }

  /**
   * Validate template application without applying
   */
  static async validateTemplateApplication(
    request: ApplyTemplateDTO
  ): Promise<TemplateValidationResult> {
    validateApplyTemplateRequest(request);

    const response = await fetch(`${TEMPLATES_BASE}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
  }

  /**
   * Batch delete templates
   */
  static async batchDeleteTemplates(
    templateIds: string[]
  ): Promise<BatchTemplateOperationResult> {
    const response = await fetch(`${TEMPLATES_BASE}/batch-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        templateIds,
      }),
    });

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
  }

  /**
   * Get template usage analytics
   */
  static async getTemplateAnalytics(templateId: string): Promise<{
    usageCount: number;
    lastUsed?: string;
    averageDemandsGenerated: number;
  }> {
    const response = await fetch(`${TEMPLATES_BASE}/${templateId}/analytics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
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
