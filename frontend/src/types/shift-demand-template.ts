/**
 * TypeScript type definitions for shift demand templates
 * Updated to match new backend DTO structure
 */

import { Dayjs } from "dayjs";

/**
 * Core template types matching backend enums
 */
export enum TemplateType {
  STANDARD = "standard",
  EVEN_ODD = "even_odd",
}

/**
 * UI view modes for template management
 */
export type TemplateViewMode = "list" | "view" | "edit";

/**
 * Individual demand entry structure (new format)
 */
export interface DemandEntryDTO {
  shiftId: string;
  dayOfWeek: number; // 0-6 (Monday=0, Sunday=6)
  count: number;
}

/**
 * Template week data structure (new format)
 */
export interface TemplateWeekDataDTO {
  weekNumber: number; // 0-based week index
  demands: DemandEntryDTO[]; // Changed from dictionary to array
}

/**
 * Core template data structure (response DTO)
 */
export interface ShiftDemandTemplateDTO {
  id: string;
  name: string;
  teamId: string;
  templateType: TemplateType;
  weeksData: TemplateWeekDataDTO[];
  description?: string;
  createdBy: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

/**
 * DTO for creating new templates (simplified)
 */
export interface ShiftDemandTemplateCreateDTO {
  name: string;
  description?: string;
  // Removed: teamId, templateType, weeksData (handled by backend)
}

/**
 * DTO for updating existing templates
 */
export interface ShiftDemandTemplateUpdateDTO {
  name?: string;
  description?: string;
  templateType?: TemplateType;
  weeksData?: TemplateWeekDataDTO[];
  // Removed: teamId (immutable)
}

/**
 * DTO for creating template from existing shift demands (new structure)
 */
export interface TemplateFromDemandsDTO {
  name: string;
  templateType: TemplateType;
  description?: string;
  startDate: number; // timestamp
  endDate: number; // timestamp
  // Removed: teamId, shiftDemands (handled by backend)
}

/**
 * DTO for applying templates to periods
 */
export interface ApplyTemplateDTO {
  templateId: string;
  startDate: number; // timestamp for application
  overwriteExisting: boolean;
}

/**
 * DTO for applying existing demands to template week
 */
export interface ApplyDemandsToTemplateWeekDTO {
  templateId: string;
  sourceWeekStartDate: number; // timestamp of source week Monday
  targetWeekNumber: number; // 0-based week number in template
}

/**
 * Response types for template operations
 */
export interface TemplateApplicationResult {
  demandsCreated: number;
  demandsUpdated: number;
  demandsSkipped: number;
  conflicts: Array<{
    date: string;
    shiftId: string;
    existingCount: number;
    templateCount: number;
  }>;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  affectedDates: string[];
  totalDemands: number;
}

/**
 * Batch operation response
 */
export interface BatchTemplateOperationResult {
  successful: string[];
  failed: Array<{
    templateId: string;
    error: string;
  }>;
}

/**
 * UI-specific types for template management
 */
export interface TemplateListItem {
  id: string;
  name: string;
  description?: string;
  templateType: TemplateType;
  createdBy: string;
  createdAt: Dayjs;
  updatedAt: Dayjs;
  totalDemands: number; // Calculated total demands across all weeks
}

export interface TemplatePreview {
  templateId: string;
  templateName: string;
  weeklyPreview: Array<{
    weekNumber: number;
    weekStartDate: Dayjs;
    demands: Array<{
      date: Dayjs;
      shiftId: string;
      shiftName: string;
      count: number;
    }>;
  }>;
  totalDemands: number;
  dateRange: {
    start: Dayjs;
    end: Dayjs;
  };
}

/**
 * Template creation methods (updated)
 */
export enum TemplateCreationMethod {
  FROM_SCRATCH = "from_scratch",
  FROM_DATE_RANGE = "from_date_range", // Updated from FROM_PERIOD
}

export interface TemplateCreationOptions {
  method: TemplateCreationMethod;
  sourcePeriodStart?: Dayjs; // For FROM_DATE_RANGE
  sourcePeriodEnd?: Dayjs; // For FROM_DATE_RANGE
}

/**
 * Template management UI state
 */
export interface TemplateManagementState {
  selectedTemplate: ShiftDemandTemplateDTO | null; // Updated type
  viewMode: TemplateViewMode;
  isLoading: boolean;
  error: string | null;
  templates: TemplateListItem[];
}

/**
 * Week selector for template creation from date ranges
 */
export interface DateRangeSelectorData {
  startDate: Dayjs;
  endDate: Dayjs;
  hasDemands: boolean;
  totalDemands: number;
  preview: Array<{
    date: Dayjs;
    shiftId: string;
    shiftName: string;
    count: number;
  }>;
}

/**
 * Template type constraints
 */
export interface TemplateTypeConstraints {
  [TemplateType.STANDARD]: {
    minWeeks: number;
    maxWeeks: number;
    allowWeekModification: boolean;
  };
  [TemplateType.EVEN_ODD]: {
    minWeeks: number;
    maxWeeks: number;
    allowWeekModification: boolean;
  };
}

export const TEMPLATE_TYPE_CONSTRAINTS: TemplateTypeConstraints = {
  [TemplateType.STANDARD]: {
    minWeeks: 1,
    maxWeeks: 8,
    allowWeekModification: true,
  },
  [TemplateType.EVEN_ODD]: {
    minWeeks: 2,
    maxWeeks: 2,
    allowWeekModification: false,
  },
} as const;

/**
 * Constants and validation (updated)
 */
export const TEMPLATE_CONSTRAINTS = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TEMPLATES_PER_TEAM: 50,
  MIN_NAME_LENGTH: 1, // Updated to match backend
  MAX_COUNT_PER_DEMAND: 50, // Updated
  MAX_WEEKS_IN_TEMPLATE: 8,
  MAX_DATE_RANGE_DAYS: 365,
} as const;

/**
 * Error types for template operations
 */
export interface TemplateErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any>;
}

export type TemplateError =
  | "validation_error"
  | "template_not_found"
  | "authorization_error"
  | "duplicate_name"
  | "template_limit_exceeded"
  | "invalid_date_range"
  | "internal_error";

/**
 * Utility functions for template data transformation
 */
export interface TemplateUtils {
  /**
   * Convert template DTO to display format
   */
  toListItem: (template: ShiftDemandTemplateDTO) => TemplateListItem;

  /**
   * Calculate total demands across all weeks
   */
  calculateTotalDemands: (weeksData: TemplateWeekDataDTO[]) => number;

  /**
   * Convert timestamps to Dayjs objects
   */
  timestampsToDayjs: (template: ShiftDemandTemplateDTO) => TemplateListItem;

  /**
   * Validate demand entry
   */
  validateDemandEntry: (entry: DemandEntryDTO) => string[];

  /**
   * Group demands by day of week
   */
  groupDemandsByDay: (
    demands: DemandEntryDTO[]
  ) => Record<number, DemandEntryDTO[]>;
}

// Legacy type aliases for backward compatibility
/** @deprecated Use ShiftDemandTemplateDTO instead */
export type ShiftDemandTemplateT = ShiftDemandTemplateDTO;

/** @deprecated Use DemandEntryDTO instead */
export type TemplateWeekDataT = DemandEntryDTO;
