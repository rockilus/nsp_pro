import React from "react";
// MUI
import TableRow from "@mui/material/TableRow";
// Components
import ShiftRowHeaderCell from "./shift-row-header-cell";
import ShiftCell from "./shift-cell";
import { generateOwnerIdDateKey } from "../shared/assignment-utils";
// Types
import { ShiftT } from "../../../../types/shift";
import {
  ScheduleT,
  periodDateT,
  AssignmentDataT,
  ScheduleCellDataT,
  ScheduleCellsDictT,
  ScheduleViewSettingsT,
} from "../../../../types/schedule";
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { CreateAssignmentT } from "@/types/assignment";
import { AssignmentT } from "@/types/assignment";
import { TeamWithMembership } from "@/types/team";
import {
  ScheduleSelectionState,
  SelectedScheduleCell,
  SelectionScope,
} from "../../../../types/scheduleSelection";

export default function ShiftTableRow({
  lng,
  teamWithMembership,
  shift,
  assignments,
  shiftDemands,
  periodDates,
  scheduleCampaign,
  scheduleCellsDict,
  scheduleViewSettings,
  selectionState,
  selectionScope,
  handleAssignmentSelection,
  handleDemandSelection,
  handleOpenCreateAssignment,
  handleCellSelect,
  handleAssignmentSelect,
  handleRowSelect,
  isCustomSolveModeActive = false,
  customSolveSelectedCells = [],
  handleCustomRowSelect,
  handleCustomCellSelect,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  shift: ShiftT;
  assignments: AssignmentT[];
  shiftDemands: ShiftDemandDTO[];
  periodDates: periodDateT[];
  scheduleCampaign: ScheduleT | null;
  scheduleCellsDict: ScheduleCellsDictT;
  scheduleViewSettings: ScheduleViewSettingsT;
  selectionState: ScheduleSelectionState;
  selectionScope: SelectionScope;
  handleAssignmentSelection: (selectedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
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
  const campaignDates = scheduleCampaign
    ? customSolveSelectedCells.filter((c) => c.rowId === shift.id)
    : [];
  const isRowCustomSelected =
    isCustomSolveModeActive && campaignDates.length > 0;
  const isRowCustomIndeterminate =
    isCustomSolveModeActive &&
    campaignDates.length > 0 &&
    campaignDates.length <
      customSolveSelectedCells.filter((c) => c.rowId === shift.id).length;

  return (
    <TableRow>
      <ShiftRowHeaderCell
        lng={lng}
        teamWithMembership={teamWithMembership}
        shift={shift}
        assignments={assignments}
        shiftDemands={shiftDemands}
        scheduleCampaign={scheduleCampaign}
        isSelectionActive={selectionState?.isActive}
        isRowSelected={
          !!selectionState?.isActive &&
          periodDates.length > 0 &&
          periodDates.every((pd) =>
            selectionState.selectedCells.some(
              (c) =>
                c.rowId === shift.id && c.date === pd.date.format("YYYY-MM-DD"),
            ),
          )
        }
        isRowIndeterminate={
          !!selectionState?.isActive &&
          !periodDates.every((pd) =>
            selectionState.selectedCells.some(
              (c) =>
                c.rowId === shift.id && c.date === pd.date.format("YYYY-MM-DD"),
            ),
          ) &&
          (periodDates.some((pd) =>
            selectionState.selectedCells.some(
              (c) =>
                c.rowId === shift.id && c.date === pd.date.format("YYYY-MM-DD"),
            ),
          ) ||
            assignments.some(
              (a) =>
                a.shiftId === shift.id &&
                selectionState.selectedAssignmentIds.includes(a.id),
            ))
        }
        onRowSelect={() => handleRowSelect(shift.id, selectionScope ?? "view")}
        isCustomSolveModeActive={isCustomSolveModeActive}
        isRowCustomSelected={isRowCustomSelected}
        isRowCustomIndeterminate={isRowCustomIndeterminate}
        onCustomRowSelect={() => handleCustomRowSelect?.(shift.id)}
      />
      {periodDates.map((pDate, dateIndex) => {
        const scheduleCellDataKey = generateOwnerIdDateKey(
          shift.id,
          pDate.date,
        );
        const scheduleCellData = scheduleCellsDict[scheduleCellDataKey] || null;
        return (
          <ShiftCell
            key={dateIndex}
            lng={lng}
            teamWithMembership={teamWithMembership}
            periodDate={pDate}
            shift={shift}
            scheduleCellData={scheduleCellData}
            scheduleViewSettings={scheduleViewSettings}
            selectionState={selectionState}
            handleAssignmentSelection={handleAssignmentSelection}
            handleDemandSelection={handleDemandSelection}
            handleOpenCreateAssignment={handleOpenCreateAssignment}
            handleCellSelect={handleCellSelect}
            handleAssignmentSelect={handleAssignmentSelect}
            isCustomSolveModeActive={isCustomSolveModeActive}
            isCustomCellSelected={customSolveSelectedCells.some(
              (c) =>
                c.rowId === shift.id &&
                c.date === pDate.date.format("YYYY-MM-DD"),
            )}
            onCustomCellSelect={() =>
              handleCustomCellSelect?.(
                shift.id,
                pDate.date.format("YYYY-MM-DD"),
                pDate.scheduleId,
              )
            }
          />
        );
      })}
    </TableRow>
  );
}
