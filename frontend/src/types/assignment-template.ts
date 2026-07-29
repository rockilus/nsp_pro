import { Dayjs } from 'dayjs';

export enum TemplateType {
  STANDARD = 'standard',
  EVEN_ODD = 'even_odd',
}

export type TemplateViewMode = 'list' | 'view' | 'edit';

export interface AssignmentTemplateEntryDTO {
  shiftId: string;
  dayOfWeek: number;
  workerIds: string[];
}

export interface AssignmentTemplateWeekDataDTO {
  weekNumber: number;
  entries: AssignmentTemplateEntryDTO[];
}

export interface AssignmentTemplateDTO {
  id: string;
  name: string;
  teamId: string;
  templateType: TemplateType;
  weeksData: AssignmentTemplateWeekDataDTO[];
  description?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface AssignmentTemplateCreateDTO {
  name: string;
  description?: string;
}

export interface AssignmentTemplateUpdateDTO {
  name?: string;
  description?: string;
  templateType?: TemplateType;
  weeksData?: AssignmentTemplateWeekDataDTO[];
}

export interface ApplyAssignmentsToTemplateWeekDTO {
  templateId: string;
  sourceWeekStartDate: number;
  targetWeekNumber: number;
}

export interface ApplyAssignmentTemplateToDateRangeDTO {
  templateId: string;
  startDate: number;
  endDate: number;
  overwriteExisting: boolean;
  shiftId?: string;
}

export interface AssignmentTemplateApplicationResult {
  success: boolean;
  assignmentsCreated: number;
  assignmentsDeleted: number;
  message: string;
}

export interface AssignmentTemplateListItem {
  id: string;
  name: string;
  description?: string;
  templateType: TemplateType;
  createdBy: string;
  createdAt: Dayjs;
  updatedAt: Dayjs;
  totalEntries: number;
}

export const ASSIGNMENT_TEMPLATE_CONSTRAINTS = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_WEEKS_IN_TEMPLATE: 8,
  MAX_DATE_RANGE_DAYS: 365,
} as const;
