import dayjs from 'dayjs';

/**
 * TypeScript types and interfaces for multitasking feature
 * Allows shift demands to be performed simultaneously by the same worker
 */

/**
 * Core multitasking group data structure
 * Represents a group of shift demands that can be performed simultaneously
 */
export interface MultitaskingGroup {
  id: string;
  type: MultitaskingGroupType;
  teamId: string;
  relatedIds: string[];
  shiftDemandTemplateId?: string | null;
  createdAt: dayjs.Dayjs;
  updatedAt: dayjs.Dayjs;
  notes?: string | null;
}

/**
 * UI state for multitasking selection mode
 */
export interface MultitaskingSelectionState {
  isActive: boolean;
  selectedShiftDemandIds: string[];
  availableShiftDemandIds: string[];
  mode: 'selecting' | 'editing';
}

/**
 * Shift demand concurrency information
 */
export interface ShiftDemandConcurrency {
  shiftDemandId: string;
  concurrentShiftDemandIds: string[];
}

/**
 * For table row selection in multitasking mode
 */
export interface ShiftDemandSelectionInfo {
  shiftDemandId: string;
  isSelectable: boolean;
  isSelected: boolean;
  isFaded: boolean;
}

/**
 * Enum for multitasking group types (matches backend DTO)
 */
export type MultitaskingGroupType = 'shift_demand' | 'shift_demand_template' | 'assignment';

/**
 * DTO for multitasking group (matches backend MultitaskingGroupDTO)
 */
export interface MultitaskingGroupDTO {
  id?: string;
  type: MultitaskingGroupType;
  teamId: string;
  relatedIds: string[];
  shiftDemandTemplateId?: string | null;
  createdAt: number; // Unix epoch
  updatedAt: number; // Unix epoch
  notes?: string | null;
}

/**
 * Data structure for creating multitasking groups (matches backend CreateMultitaskingGroupRequest)
 */
export interface CreateMultitaskingGroupRequest {
  type: MultitaskingGroupType;
  teamId: string;
  relatedIds: string[];
  shiftDemandTemplateId?: string | null;
  notes?: string | null;
}

/**
 * Data structure for updating multitasking groups (matches backend UpdateMultitaskingGroupRequest)
 */
export interface UpdateMultitaskingGroupRequest {
  id: string;
  type?: MultitaskingGroupType;
  teamId?: string;
  relatedIds?: string[];
  shiftDemandTemplateId?: string | null;
  notes?: string | null;
}

/**
 * Request for shift demand concurrency data
 */
export interface ShiftDemandConcurrencyRequest {
  teamId: string;
  startDate: number; // Unix timestamp
  endDate: number; // Unix timestamp
}

/**
 * Response containing shift demand concurrency data for a period
 */
export interface ShiftDemandConcurrencyResponse {
  teamId: string;
  startDate: number; // Unix timestamp
  endDate: number; // Unix timestamp
  concurrencyList: ShiftDemandConcurrency[];
}

/**
 * Converts a MultitaskingGroupDTO to a MultitaskingGroup (with dayjs dates and correct field mapping)
 */
export function toMultitaskingGroup(dto: MultitaskingGroupDTO): MultitaskingGroup {
  return {
    id: dto.id || '',
    type: dto.type,
    teamId: dto.teamId,
    relatedIds: dto.relatedIds,
    shiftDemandTemplateId: dto.shiftDemandTemplateId ?? null,
    createdAt: dayjs.unix(dto.createdAt).utc(),
    updatedAt: dayjs.unix(dto.updatedAt).utc(),
    notes: dto.notes ?? null,
  };
}
