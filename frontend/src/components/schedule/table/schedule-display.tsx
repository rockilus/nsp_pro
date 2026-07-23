import React from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
// Components
import ScheduleTableShift from './shift-table/schedule-table-shift';
import ScheduleTableWorker from './worker-table/schedule-table-worker';
// Types
import {
  ScheduleT,
  periodDateT,
  AssignmentDataT,
  ScheduleCellDataT,
  ScheduleViewSettingsT,
} from '../../../types/schedule';
import { BreachT } from '@/types/breach';
import { ShiftDemandDTO } from '@/types/shiftDemand';
import { AssignmentT, CreateAssignmentT } from '@/types/assignment';
import { ShiftT } from '../../../types/shift';
import { WorkerT } from '../../../types/worker';
import { RequestT } from '../../../types/request';
import { RecurrenceRuleT } from '@/types/recurrence';
import { RotationT } from '@/types/rotation';
import { TeamWithMembership } from '@/types/team';
import {
  ScheduleSelectionState,
  SelectedScheduleCell,
  SelectionScope,
} from '../../../types/scheduleSelection';
import { ColumnFilter, TableSort } from '../../../types/filter';

dayjs.extend(utc);

export default function ScheduleDisplay({
  lng,
  teamWithMembership,
  scheduleCampaign,
  periodDates,
  assignments,
  shiftDemands,
  recurrences,
  rotations,
  breaches,
  workers,
  shifts,
  requests,
  scheduleViewSettings,
  selectionState,
  selectionScope,
  handleAssignmentSelection,
  handleDemandSelection,
  handleRequestSelection,
  handleOpenCreateAssignment,
  handleCellSelect,
  handleAssignmentSelect,
  handleRowSelect,
  handleColumnSelect,
  handleSelectAll,
  isCustomSolveModeActive = false,
  customSolveSelectedCells = [],
  handleCustomRowSelect,
  handleCustomColumnSelect,
  handleCustomCellSelect,
  handleCustomSelectAll,
  workerTableSort,
  onWorkerTableSort,
  workerTableFilter,
  onWorkerTableFilter,
  shiftTableSort,
  onShiftTableSort,
  shiftTableFilter,
  onShiftTableFilter,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  assignments: AssignmentT[];
  shiftDemands: ShiftDemandDTO[];
  recurrences: RecurrenceRuleT[];
  rotations: RotationT[];
  breaches: BreachT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
  scheduleViewSettings: ScheduleViewSettingsT;
  selectionState: ScheduleSelectionState;
  selectionScope: SelectionScope;
  handleAssignmentSelection: (selectedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  handleRequestSelection?: (request: RequestT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
  handleCellSelect: (rowId: string, date: string, scheduleId: string | null) => void;
  handleAssignmentSelect: (assignmentId: string) => void;
  handleRowSelect: (rowId: string, scope: SelectionScope) => void;
  handleColumnSelect: (date: string, rowIds: string[], scope: SelectionScope) => void;
  handleSelectAll: (rowIds: string[], scope: SelectionScope) => void;
  isCustomSolveModeActive?: boolean;
  customSolveSelectedCells?: SelectedScheduleCell[];
  handleCustomRowSelect?: (rowId: string) => void;
  handleCustomColumnSelect?: (date: string, rowIds: string[]) => void;
  handleCustomCellSelect?: (rowId: string, date: string, scheduleId: string | null) => void;
  handleCustomSelectAll?: (cells: SelectedScheduleCell[]) => void;
  workerTableSort: TableSort | null;
  onWorkerTableSort: (sort: TableSort | null) => void;
  workerTableFilter: ColumnFilter | null;
  onWorkerTableFilter: (filter: ColumnFilter | null) => void;
  shiftTableSort: TableSort | null;
  onShiftTableSort: (sort: TableSort | null) => void;
  shiftTableFilter: ColumnFilter | null;
  onShiftTableFilter: (filter: ColumnFilter | null) => void;
}) {
  const scheduleDisplays: { [key: string]: React.ReactElement } = {
    shift: (
      <ScheduleTableShift
        lng={lng}
        teamWithMembership={teamWithMembership}
        shifts={shifts}
        workers={workers}
        requests={requests}
        assignments={assignments}
        shiftDemands={shiftDemands}
        recurrences={recurrences}
        rotations={rotations}
        scheduleCampaign={scheduleCampaign}
        periodDates={periodDates}
        breaches={breaches}
        scheduleViewSettings={scheduleViewSettings}
        selectionState={selectionState}
        selectionScope={selectionScope}
        handleAssignmentSelection={handleAssignmentSelection}
        handleDemandSelection={handleDemandSelection}
        handleOpenCreateAssignment={handleOpenCreateAssignment}
        handleCellSelect={handleCellSelect}
        handleAssignmentSelect={handleAssignmentSelect}
        handleRowSelect={handleRowSelect}
        handleColumnSelect={handleColumnSelect}
        handleSelectAll={handleSelectAll}
        isCustomSolveModeActive={isCustomSolveModeActive}
        customSolveSelectedCells={customSolveSelectedCells}
        handleCustomRowSelect={handleCustomRowSelect}
        handleCustomColumnSelect={handleCustomColumnSelect}
        handleCustomCellSelect={handleCustomCellSelect}
        handleCustomSelectAll={handleCustomSelectAll}
        currentSort={shiftTableSort}
        onSort={onShiftTableSort}
        currentFilter={shiftTableFilter}
        onFilter={onShiftTableFilter}
      />
    ),
    worker: (
      <ScheduleTableWorker
        lng={lng}
        teamWithMembership={teamWithMembership}
        shifts={shifts}
        workers={workers}
        requests={requests}
        assignments={assignments}
        shiftDemands={shiftDemands}
        recurrences={recurrences}
        rotations={rotations}
        scheduleCampaign={scheduleCampaign}
        periodDates={periodDates}
        breaches={breaches}
        scheduleViewSettings={scheduleViewSettings}
        selectionState={selectionState}
        selectionScope={selectionScope}
        handleAssignmentSelection={handleAssignmentSelection}
        handleRequestSelection={handleRequestSelection}
        handleOpenCreateAssignment={handleOpenCreateAssignment}
        handleCellSelect={handleCellSelect}
        handleAssignmentSelect={handleAssignmentSelect}
        handleRowSelect={handleRowSelect}
        handleColumnSelect={handleColumnSelect}
        handleSelectAll={handleSelectAll}
        isCustomSolveModeActive={isCustomSolveModeActive}
        customSolveSelectedCells={customSolveSelectedCells}
        handleCustomRowSelect={handleCustomRowSelect}
        handleCustomColumnSelect={handleCustomColumnSelect}
        handleCustomCellSelect={handleCustomCellSelect}
        handleCustomSelectAll={handleCustomSelectAll}
        currentSort={workerTableSort}
        onSort={onWorkerTableSort}
        currentFilter={workerTableFilter}
        onFilter={onWorkerTableFilter}
      />
    ),
  };

  return scheduleDisplays[scheduleViewSettings.groupBy];
}
