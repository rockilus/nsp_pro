export enum TemplateType {
  STANDARD = 'standard',
  EVEN_ODD = 'even_odd',
}

export interface ScheduleTemplateEntryDTO {
  shiftId: string;
  dayOfWeek: number;
  demandCount: number;
  workerIds: string[];
}

export interface ScheduleTemplateWeekDataDTO {
  weekNumber: number;
  entries: ScheduleTemplateEntryDTO[];
}

export interface ScheduleTemplateDTO {
  id: string;
  name: string;
  teamId: string;
  templateType: TemplateType;
  weeksData: ScheduleTemplateWeekDataDTO[];
  scopeShiftIds: string[];
  description?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScheduleTemplateCreateDTO {
  name: string;
  description?: string;
  templateType?: TemplateType;
  scopeShiftIds?: string[];
}

export interface ScheduleTemplateUpdateDTO {
  name?: string;
  description?: string;
  templateType?: TemplateType;
  scopeShiftIds?: string[];
  weeksData?: ScheduleTemplateWeekDataDTO[];
}

export interface ApplyScheduleTemplateToDateRangeDTO {
  templateId: string;
  startDate: number;
  endDate: number;
  startWeekNumber: number;
  overwriteDemands: boolean;
  overwriteAssignments: boolean;
}

export interface ScheduleTemplateApplicationResult {
  success: boolean;
  demandsCreated: number;
  demandsDeleted: number;
  assignmentsCreated: number;
  assignmentsDeleted: number;
  message: string;
}

export const SCHEDULE_TEMPLATE_CONSTRAINTS = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_WEEKS_IN_TEMPLATE: 8,
  MAX_DATE_RANGE_DAYS: 365,
} as const;

export const TEMPLATE_TYPE_CONSTRAINTS = {
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
