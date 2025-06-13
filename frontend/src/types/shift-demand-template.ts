/**
 * TypeScript type definitions for shift demand templates
 * Mirrors backend DTOs for consistent API communication
 */

import { Dayjs } from "dayjs";

/**
 * Core template types matching backend enums
 */
export enum TemplateType {
  STANDARD = "standard",
  EVEN_ODD = "even_odd",
}

export enum WeekType {
  STANDARD = "standard",
  EVEN = "even",
  ODD = "odd",
}

/**
 * UI view modes for template management
 */
export type TemplateViewMode = "list" | "view" | "edit";

/**
 * Template week data structure
 */
export interface TemplateWeekDataT {
  shiftId: string;
  dayOfWeek: number; // 0-6 (Monday=0, Sunday=6)
  count: number;
}

/**
 * Core template data structure
 */
export interface ShiftDemandTemplateT {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  templateType: TemplateType;
  standardWeekData: TemplateWeekDataT[];
  evenWeekData?: TemplateWeekDataT[];
  oddWeekData?: TemplateWeekDataT[];
  createdBy: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * DTO for creating new templates
 */
export interface ShiftDemandTemplateCreateDTO {
  name: string;
  description?: string;
  templateType: TemplateType;
  standardWeekData: TemplateWeekDataT[];
  evenWeekData?: TemplateWeekDataT[];
  oddWeekData?: TemplateWeekDataT[];
}

/**
 * DTO for updating existing templates
 */
export interface ShiftDemandTemplateUpdateDTO {
  name?: string;
  description?: string;
  templateType?: TemplateType;
  standardWeekData?: TemplateWeekDataT[];
  evenWeekData?: TemplateWeekDataT[];
  oddWeekData?: TemplateWeekDataT[];
}

/**
 * DTO for applying templates to periods
 */
export interface ApplyTemplateDTO {
  templateId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  overwriteExisting: boolean;
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
    weekType: WeekType;
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
 * Template creation methods
 */
export enum TemplateCreationMethod {
  FROM_SCRATCH = "from_scratch",
  FROM_EXISTING_WEEK = "from_existing_week",
  FROM_PERIOD = "from_period",
}

export interface TemplateCreationOptions {
  method: TemplateCreationMethod;
  sourceWeekStart?: Dayjs; // For FROM_EXISTING_WEEK
  sourcePeriodStart?: Dayjs; // For FROM_PERIOD
  sourcePeriodEnd?: Dayjs; // For FROM_PERIOD
}

/**
 * Template management UI state
 */
export interface TemplateManagementState {
  selectedTemplate: ShiftDemandTemplateT | null;
  viewMode: TemplateViewMode;
  isLoading: boolean;
  error: string | null;
  templates: TemplateListItem[];
}

/**
 * Week selector for template creation from existing weeks
 */
export interface WeekSelectorData {
  weekStart: Dayjs;
  weekEnd: Dayjs;
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
 * Constants and validation
 */
export const TEMPLATE_CONSTRAINTS = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TEMPLATES_PER_TEAM: 50,
  MIN_NAME_LENGTH: 3,
  MAX_COUNT_PER_DEMAND: 20,
  MAX_WEEKS_IN_PERIOD: 52,
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
