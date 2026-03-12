import React from "react";
import dayjs from "dayjs";
// MUI
import TableRow from "@mui/material/TableRow";
// Components
import DateHeaderCell from "./date-header-cell";
import ExportCell from "./export-cell";
// Types
import {
  ExportOptionsT,
  ScheduleT,
  ScheduleStatus,
  periodDateT,
} from "../../../../types/schedule";
import { TeamWithMembership } from "@/types/team";
import {
  ScheduleSelectionState,
  SelectionScope,
} from "../../../../types/scheduleSelection";
import { AssignmentT } from "@/types/assignment";

export default function DatesHeaderRow({
  lng,
  teamWithMembership,
  periodDates,
  scheduleCampaign,
  handleExportSchedule,
  isSelectionActive,
  selectionState,
  rowIds,
  selectionScope,
  handleColumnSelect,
  handleSelectAll,
  assignments,
  isCustomSolveModeActive = false,
  handleCustomColumnSelect,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  periodDates: periodDateT[];
  scheduleCampaign: ScheduleT | null;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
  isSelectionActive: boolean;
  selectionState: ScheduleSelectionState;
  rowIds: string[];
  selectionScope: SelectionScope;
  handleColumnSelect: (
    date: string,
    rowIds: string[],
    scope: SelectionScope,
  ) => void;
  handleSelectAll: (rowIds: string[], scope: SelectionScope) => void;
  assignments: AssignmentT[];
  isCustomSolveModeActive?: boolean;
  handleCustomColumnSelect?: (date: string, rowIds: string[]) => void;
}) {
  return (
    <TableRow
      style={{
        backgroundColor: "white",
        boxShadow: "1px 1px 0px 0px rgba(224, 224, 224, 1)",
      }}
      data-testid="dates-header-row"
    >
      <ExportCell
        lng={lng}
        periodDates={periodDates}
        scheduleCampaign={scheduleCampaign}
        handleExportSchedule={handleExportSchedule}
        isSelectionActive={isSelectionActive}
        selectionState={selectionState}
        rowIds={rowIds}
        selectionScope={selectionScope}
        handleSelectAll={handleSelectAll}
      />
      {periodDates.map((pDate, dateIndex) => (
        <DateHeaderCell
          key={dateIndex}
          periodDate={pDate}
          teamWithMembership={teamWithMembership}
          lng={lng}
          isSelectionActive={isSelectionActive}
          selectionState={selectionState}
          rowIds={rowIds}
          selectionScope={selectionScope}
          onColumnSelect={handleColumnSelect}
          assignments={assignments}
          isCustomSolveModeActive={isCustomSolveModeActive}
          onCustomColumnSelect={handleCustomColumnSelect}
        />
      ))}
    </TableRow>
  );
}
