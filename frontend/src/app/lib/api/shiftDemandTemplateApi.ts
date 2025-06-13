/**
 * API client for shift demand template management
 * Handles all HTTP requests to the template endpoints with enhanced
 * error handling and validation
 */

import {
  ShiftDemandTemplateT,
  ShiftDemandTemplateCreateDTO,
  ShiftDemandTemplateUpdateDTO,
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
 * Client-side validation for template creation
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

  if (!template.standardWeekData || template.standardWeekData.length === 0) {
    throw new Error("Template must have at least one standard week demand");
  }

  // Validate week data
  template.standardWeekData.forEach((demand) => {
    if (demand.dayOfWeek < 0 || demand.dayOfWeek > 6) {
      throw new Error("Day of week must be between 0 (Monday) and 6 (Sunday)");
    }
    if (
      demand.count < 0 ||
      demand.count > TEMPLATE_CONSTRAINTS.MAX_COUNT_PER_DEMAND
    ) {
      throw new Error(
        `Demand count must be between 0 and ${TEMPLATE_CONSTRAINTS.MAX_COUNT_PER_DEMAND}`
      );
    }
  });

  // Validate even/odd week data if template type is even_odd
  if (template.templateType === "even_odd") {
    if (!template.evenWeekData || !template.oddWeekData) {
      throw new Error(
        "Even/odd template type requires both even and odd week data"
      );
    }

    [...template.evenWeekData, ...template.oddWeekData].forEach((demand) => {
      if (demand.dayOfWeek < 0 || demand.dayOfWeek > 6) {
        throw new Error(
          "Day of week must be between 0 (Monday) and 6 (Sunday)"
        );
      }
      if (
        demand.count < 0 ||
        demand.count > TEMPLATE_CONSTRAINTS.MAX_COUNT_PER_DEMAND
      ) {
        throw new Error(
          `Demand count must be between 0 and ${TEMPLATE_CONSTRAINTS.MAX_COUNT_PER_DEMAND}`
        );
      }
    });
  }
};

/**
 * Client-side validation for template application
 */
const validateApplyTemplateRequest = (request: ApplyTemplateDTO): void => {
  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);

  if (startDate >= endDate) {
    throw new Error("End date must be after start date");
  }

  const weeksDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  if (weeksDiff > TEMPLATE_CONSTRAINTS.MAX_WEEKS_IN_PERIOD) {
    throw new Error(
      `Date range cannot exceed ${TEMPLATE_CONSTRAINTS.MAX_WEEKS_IN_PERIOD} weeks`
    );
  }
};

/**
 * Main API client class for template operations
 */
export class ShiftDemandTemplateApi {
  /**
   * Get all templates for a team
   */
  static async getTemplates(teamId: string): Promise<ShiftDemandTemplateT[]> {
    const response = await fetch(`${TEMPLATES_BASE}?team_id=${teamId}`, {
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
   * Get a specific template by ID
   */
  static async getTemplate(templateId: string): Promise<ShiftDemandTemplateT> {
    const response = await fetch(`${TEMPLATES_BASE}/${templateId}`, {
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
   * Create a new template
   */
  static async createTemplate(
    teamId: string,
    template: ShiftDemandTemplateCreateDTO
  ): Promise<ShiftDemandTemplateT> {
    validateTemplateCreateRequest(template);

    const response = await fetch(TEMPLATES_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        teamId,
        ...template,
      }),
    });

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
  }

  /**
   * Create a new template with empty week data (bypassing client-side validation)
   * This is useful for creating basic templates that can be edited later
   */
  static async createEmptyTemplate(
    teamId: string,
    template: ShiftDemandTemplateCreateDTO
  ): Promise<ShiftDemandTemplateT> {
    // Skip client-side validation for empty templates
    const response = await fetch(`${TEMPLATES_BASE}/teams/${teamId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        teamId,
        ...template,
      }),
    });

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(
    templateId: string,
    update: ShiftDemandTemplateUpdateDTO
  ): Promise<ShiftDemandTemplateT> {
    const response = await fetch(`${TEMPLATES_BASE}/${templateId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      await handleTemplateAPIError(response);
    }

    return response.json();
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    const response = await fetch(`${TEMPLATES_BASE}/${templateId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

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
  calculateTotalDemands(template: ShiftDemandTemplateT): number {
    let total = template.standardWeekData.reduce(
      (sum, demand) => sum + demand.count,
      0
    );

    if (template.templateType === "even_odd") {
      const evenTotal =
        template.evenWeekData?.reduce((sum, demand) => sum + demand.count, 0) ||
        0;
      const oddTotal =
        template.oddWeekData?.reduce((sum, demand) => sum + demand.count, 0) ||
        0;
      total = Math.max(evenTotal, oddTotal); // Use the larger of the two for display
    }

    return total;
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
