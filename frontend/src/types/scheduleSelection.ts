export interface SelectedScheduleCell {
  rowId: string; // shiftId (shift view) or workerId (worker view)
  date: string; // "YYYY-MM-DD"
  scheduleId: string | null;
}

export type SelectionScope = 'view' | 'campaign';

export interface ScheduleSelectionState {
  isActive: boolean;
  selectedCells: SelectedScheduleCell[]; // empty cells targeted for creation
  selectedAssignmentIds: string[]; // existing assignments targeted for edit/delete
}
