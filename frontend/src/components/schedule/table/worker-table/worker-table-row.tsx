import React from "react";
// MUI
import TableRow from "@mui/material/TableRow";
// Components
import WorkerRowHeaderCell from "./worker-row-header-cell";
import WorkerCell from "./worker-cell";
import { generateOwnerIdDateKey } from "../shared/assignment-utils";
// Types
import { ShiftT } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  ScheduleT,
  periodDateT,
  ScheduleViewSettingsT,
  ScheduleCellsDictT,
} from "../../../../types/schedule";
import {
  AssignmentT,
  AssignmentDataDictT,
  CreateAssignmentT,
} from "@/types/assignment";
import { RequestT } from "../../../../types/request";
import { TeamWithMembership } from "@/types/team";
import {
  ScheduleSelectionState,
  SelectedScheduleCell,
  SelectionScope,
} from "@/types/scheduleSelection";

export default function WorkerTableRow({
  lng,
  shifts,
  worker,
  assignments,
  scheduleCampaign,
  periodDates,
  scheduleCellsDict,
  scheduleViewSettings,
  teamWithMembership,
  handleAssignmentSelection,
  handleRequestSelection,
  handleOpenCreateAssignment,
  selectionState,
  selectionScope,
  handleCellSelect,
  handleAssignmentSelect,
  handleRowSelect,
  isCustomSolveModeActive = false,
  customSolveSelectedCells = [],
  handleCustomRowSelect,
  handleCustomCellSelect,
}: {
  lng: string;
  shifts: ShiftT[];
  worker: WorkerT;
  assignments: AssignmentT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  scheduleCellsDict: ScheduleCellsDictT;
  scheduleViewSettings: ScheduleViewSettingsT;
  teamWithMembership: TeamWithMembership;
  handleAssignmentSelection: (selectedCell: AssignmentDataDictT) => void;
  handleRequestSelection?: (request: RequestT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
  selectionState: ScheduleSelectionState;
  selectionScope: SelectionScope;
  handleCellSelect: (
    rowId: string,
    date: string,
    scheduleId: string | null,
  ) => void;
  handleAssignmentSelect: (assignmentId: string) => void;
  handleRowSelect: (rowId: string, scope: SelectionScope) => void;
  isCustomSolveModeActive?: boolean;
  customSolveSelectedCells?: SelectedScheduleCell[];
  handleCustomRowSelect?: (rowId: string) => void;
  handleCustomCellSelect?: (
    rowId: string,
    date: string,
    scheduleId: string | null,
  ) => void;
}) {
  // Derive custom solve row state
  const workerCustomCells = customSolveSelectedCells.filter(
    (c) => c.rowId === worker.id,
  );
  const isRowCustomSelected =
    isCustomSolveModeActive && workerCustomCells.length > 0;
  const isRowCustomIndeterminate = false; // row sparkle is checked when any cell selected

  return (
    <TableRow>
      <WorkerRowHeaderCell
        lng={lng}
        shifts={shifts}
        worker={worker}
        assignments={assignments}
        scheduleCampaign={scheduleCampaign}
        teamWithMembership={teamWithMembership}
        isSelectionActive={selectionState?.isActive}
        isRowSelected={
          !!selectionState?.isActive &&
          periodDates.length > 0 &&
          periodDates.every((pd) =>
            selectionState.selectedCells.some(
              (c) =>
                c.rowId === worker.id &&
                c.date === pd.date.format("YYYY-MM-DD"),
            ),
          )
        }
        isRowIndeterminate={
          !!selectionState?.isActive &&
          !periodDates.every((pd) =>
            selectionState.selectedCells.some(
              (c) =>
                c.rowId === worker.id &&
                c.date === pd.date.format("YYYY-MM-DD"),
            ),
          ) &&
          (periodDates.some((pd) =>
            selectionState.selectedCells.some(
              (c) =>
                c.rowId === worker.id &&
                c.date === pd.date.format("YYYY-MM-DD"),
            ),
          ) ||
            assignments.some(
              (a) =>
                a.workerId === worker.id &&
                selectionState.selectedAssignmentIds.includes(a.id),
            ))
        }
        onRowSelect={() =>
          handleRowSelect?.(worker.id, selectionScope ?? "view")
        }
        isCustomSolveModeActive={isCustomSolveModeActive}
        isRowCustomSelected={isRowCustomSelected}
        isRowCustomIndeterminate={isRowCustomIndeterminate}
        onCustomRowSelect={() => handleCustomRowSelect?.(worker.id)}
      />
      {periodDates.map((pDate, dateIndex) => {
        const scheduleCellDataKey = generateOwnerIdDateKey(
          worker.id,
          pDate.date,
        );
        const scheduleCellData = scheduleCellsDict[scheduleCellDataKey] || null;
        return (
          <WorkerCell
            key={dateIndex}
            periodDate={pDate}
            worker={worker}
            shifts={shifts}
            scheduleCellData={scheduleCellData}
            scheduleViewSettings={scheduleViewSettings}
            teamWithMembership={teamWithMembership}
            handleAssignmentSelection={handleAssignmentSelection}
            handleRequestSelection={handleRequestSelection}
            handleOpenCreateAssignment={handleOpenCreateAssignment}
            selectionState={selectionState}
            handleCellSelect={handleCellSelect}
            handleAssignmentSelect={handleAssignmentSelect}
            isCustomSolveModeActive={isCustomSolveModeActive}
            isCustomCellSelected={customSolveSelectedCells.some(
              (c) =>
                c.rowId === worker.id &&
                c.date === pDate.date.format("YYYY-MM-DD"),
            )}
            onCustomCellSelect={() =>
              handleCustomCellSelect?.(
                worker.id,
                pDate.date.format("YYYY-MM-DD"),
                pDate.scheduleId,
              )
            }
            isDateInCampaign={
              scheduleCampaign
                ? !pDate.date.isBefore(scheduleCampaign.startDate, "day") &&
                  !pDate.date.isAfter(scheduleCampaign.endDate, "day")
                : false
            }
          />
        );
      })}
    </TableRow>
  );
}
