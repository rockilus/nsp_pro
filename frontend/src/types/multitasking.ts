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
  teamId: string;
  shiftDemandIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * UI state for multitasking selection mode
 */
export interface MultitaskingSelectionState {
  isActive: boolean;
  selectedShiftDemandIds: string[];
  availableShiftDemandIds: string[];
  mode: "selecting" | "editing";
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
 * Data structure for creating multitasking groups
 */
export interface CreateMultitaskingGroupRequest {
  teamId: string;
  shiftDemandIds: string[];
}

/**
 * Data structure for updating multitasking groups
 */
export interface UpdateMultitaskingGroupRequest {
  shiftDemandIds: string[];
}
