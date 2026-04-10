/**
 * Template validation utilities for shift demand templates
 * Handles constraints and validation logic for different template types
 */

import {
  TemplateType,
  ShiftDemandTemplateDTO,
  TEMPLATE_TYPE_CONSTRAINTS,
} from '../types/shift-demand-template';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  message?: string;
}

/**
 * Extended validation result for template type changes
 */
export interface TemplateTypeChangeValidation extends ValidationResult {
  requiresConfirmation?: boolean;
  weeksToDelete?: number[];
  currentWeeks?: number;
  targetWeeks?: number;
}

/**
 * Week management constraints for UI
 */
export interface WeekManagementConstraints {
  canAddWeek: boolean;
  canRemoveWeek: boolean;
  maxWeeksReached: boolean;
  templateTypeRestricted: boolean;
  addButtonDisabledReason?: string;
  removeButtonDisabledReason?: string;
}

/**
 * Validate template constraints for a given type and week count
 */
export const validateTemplateConstraints = (
  templateType: TemplateType,
  weeksCount: number,
): ValidationResult => {
  const constraints = TEMPLATE_TYPE_CONSTRAINTS[templateType];

  if (weeksCount < constraints.minWeeks) {
    return {
      isValid: false,
      error: 'insufficient_weeks',
      message: `${templateType} templates require at least ${constraints.minWeeks} weeks`,
    };
  }

  if (weeksCount > constraints.maxWeeks) {
    return {
      isValid: false,
      error: 'too_many_weeks',
      message: `${templateType} templates cannot have more than ${constraints.maxWeeks} weeks`,
    };
  }

  return { isValid: true };
};

/**
 * Validate template for type change and determine if confirmation is needed
 */
export const validateTemplateForTypeChange = (
  currentType: TemplateType,
  newType: TemplateType,
  currentWeeks: number,
): TemplateTypeChangeValidation => {
  const newConstraints = TEMPLATE_TYPE_CONSTRAINTS[newType];

  // If switching to EVEN_ODD and current weeks is not 2
  if (newType === TemplateType.EVEN_ODD && currentWeeks !== 2) {
    if (currentWeeks > 2) {
      const weeksToDelete: number[] = [];

      // Collect weeks that will be deleted (keep only first 2)
      for (let i = 2; i < currentWeeks; i++) {
        weeksToDelete.push(i);
      }

      return {
        isValid: true,
        requiresConfirmation: true,
        weeksToDelete,
        currentWeeks,
        targetWeeks: 2,
        message: `Converting to Even/Odd will delete ${weeksToDelete.length} week(s)`,
      };
    } else if (currentWeeks < 2) {
      // Template has fewer than 2 weeks - we'll automatically add weeks
      return {
        isValid: true,
        requiresConfirmation: false, // No confirmation needed for adding weeks
        weeksToDelete: [],
        currentWeeks,
        targetWeeks: 2,
        message: `Converting to Even/Odd will add ${2 - currentWeeks} week(s)`,
      };
    }
  }

  // Standard validation for other cases
  const validation = validateTemplateConstraints(newType, currentWeeks);
  return {
    ...validation,
    requiresConfirmation: false,
    currentWeeks,
    targetWeeks: currentWeeks,
  };
};

/**
 * Get week management constraints based on template type and current state
 */
export const getWeekManagementConstraints = (
  templateType: TemplateType,
  currentWeeks: number,
): WeekManagementConstraints => {
  const constraints = TEMPLATE_TYPE_CONSTRAINTS[templateType];

  if (templateType === TemplateType.EVEN_ODD) {
    return {
      canAddWeek: false,
      canRemoveWeek: false,
      maxWeeksReached: true,
      templateTypeRestricted: true,
      addButtonDisabledReason: 'even_odd_weeks_fixed',
      removeButtonDisabledReason: 'even_odd_weeks_fixed',
    };
  }

  const canAddWeek = currentWeeks < constraints.maxWeeks;
  const canRemoveWeek = currentWeeks > constraints.minWeeks;

  return {
    canAddWeek,
    canRemoveWeek,
    maxWeeksReached: currentWeeks >= constraints.maxWeeks,
    templateTypeRestricted: false,
    addButtonDisabledReason: canAddWeek ? undefined : 'max_weeks_reached',
    removeButtonDisabledReason: canRemoveWeek ? undefined : 'min_weeks_required',
  };
};

/**
 * Validate template before save operation
 */
export const validateTemplateBeforeSave = (template: ShiftDemandTemplateDTO): ValidationResult => {
  const weeksCount = template.weeksData.length;

  // Validate basic constraints
  const constraintsValidation = validateTemplateConstraints(template.templateType, weeksCount);

  if (!constraintsValidation.isValid) {
    return constraintsValidation;
  }

  // Additional validations can be added here
  // - Check for empty weeks
  // - Validate demand entries
  // - Check for required shifts

  return { isValid: true };
};

/**
 * Check if template type change requires user confirmation
 */
export const requiresConfirmationForTypeChange = (
  currentType: TemplateType,
  newType: TemplateType,
  currentWeeks: number,
): boolean => {
  const validation = validateTemplateForTypeChange(currentType, newType, currentWeeks);
  return validation.requiresConfirmation || false;
};

/**
 * Get user-friendly error message for validation errors
 */
export const getValidationErrorMessage = (
  error: string,
  templateType?: TemplateType,
  weeksCount?: number,
): string => {
  switch (error) {
    case 'insufficient_weeks':
      return templateType === TemplateType.EVEN_ODD
        ? 'Even/Odd templates require exactly 2 weeks'
        : 'Template must have at least 1 week';

    case 'too_many_weeks':
      return templateType === TemplateType.EVEN_ODD
        ? 'Even/Odd templates can only have 2 weeks'
        : 'Template cannot have more than 8 weeks';

    case 'insufficient_weeks_for_even_odd':
      return 'Cannot convert to Even/Odd: template needs at least 2 weeks. Please add a week first.';

    case 'even_odd_requires_two_weeks':
      return 'Even/Odd templates must have exactly 2 weeks';

    default:
      return 'Template validation failed';
  }
};
