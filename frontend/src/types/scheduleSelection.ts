export interface SelectedScheduleCell {
  rowId: string; // shiftId (shift view) or workerId (worker view)
  date: string; // "YYYY-MM-DD"
  scheduleId: string | null;
}

export type SelectionScope = 'view' | 'campaign';

/**
 * Optional implicit component: captures "all of these rows across the full campaign".
 * Present only in campaign scope when a row-level or "select all" gesture was used.
 * In shift view, selectedRowIds holds shift IDs; in worker view, worker IDs.
 */
export interface CampaignSelectionIntent {
  campaignId: string;
  /** empty = all rows in campaign */
  selectedRowIds: string[];
  /** IDs of individual assignments deselected from the implicit set */
  excludedAssignmentIds: string[];
}

export interface ScheduleSelectionState {
  isActive: boolean;
  scope: SelectionScope;
  selectedCells: SelectedScheduleCell[]; // empty cells targeted for creation
  selectedAssignmentIds: string[]; // explicit individual assignments (always resolved IDs)
  /** Present only in campaign scope when row/all gestures produced implicit intent */
  campaignIntent?: CampaignSelectionIntent;
}
