import React from "react";
// MUI
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
// Components
import DatesHeaderRow from "../shared/dates-header-row";
import DailyShiftDemandRow from "../shared/daily-shift-demand-row";
import WorkerTableRow from "./worker-table-row";
import { buildScheduleCellDict } from "../shared/assignment-utils";
import { getRelevantWorkers } from "./worker-table-utils";
// Types
import { ShiftT } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  ScheduleT,
  ExportOptionsT,
  periodDateT,
  ScheduleViewSettingsT,
} from "../../../../types/schedule";
import { BreachT } from "@/types/breach";
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { CreateAssignmentT } from "@/types/assignment";
import { AssignmentDataDictT } from "@/types/assignment";
import { AssignmentT } from "@/types/assignment";
import { RequestT } from "../../../../types/request";
import { AttributeOwnerType } from "../../../../types/attribute";
import { RecurrenceRuleT } from "@/types/recurrence";
import { TeamMembershipRole, TeamWithMembership } from "@/types/team";
import {
  ScheduleSelectionState,
  SelectionScope,
} from "@/types/scheduleSelection";

export default function ScheduleTableWorker({
  lng,
  teamWithMembership,
  shifts,
  workers,
  requests,
  assignments,
  shiftDemands,
  recurrences,
  scheduleCampaign,
  periodDates,
  breaches,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleRequestSelection,
  handleExportSchedule,
  handleOpenCreateAssignment,
  selectionState,
  selectionScope,
  handleCellSelect,
  handleAssignmentSelect,
  handleRowSelect,
  handleColumnSelect,
  handleSelectAll,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  shifts: ShiftT[];
  workers: WorkerT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  shiftDemands: ShiftDemandDTO[];
  recurrences: RecurrenceRuleT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  breaches: BreachT[];
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (selectedCell: AssignmentDataDictT) => void;
  handleRequestSelection?: (request: RequestT) => void;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
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
  handleColumnSelect: (
    date: string,
    rowIds: string[],
    scope: SelectionScope,
  ) => void;
  handleSelectAll: (rowIds: string[], scope: SelectionScope) => void;
}) {
  const workersForHeader = getRelevantWorkers(
    workers,
    assignments,
    scheduleCampaign,
  );

  const scheduleCellDict = buildScheduleCellDict(
    AttributeOwnerType.WORKER,
    assignments,
    shiftDemands,
    recurrences,
    requests,
    workers,
    shifts,
    breaches,
  );

  return (
    <TableContainer
      component={Paper}
      style={{ width: "100%", height: "calc(100vh - 104px)" }}
      data-testid="schedule-table-worker"
    >
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            backgroundColor: "white",
          }}
        >
          <DatesHeaderRow
            lng={lng}
            periodDates={periodDates}
            scheduleCampaign={scheduleCampaign}
            handleExportSchedule={handleExportSchedule}
            teamWithMembership={teamWithMembership}
            isSelectionActive={selectionState?.isActive}
            selectionState={selectionState}
            rowIds={workersForHeader.map((w) => w.id)}
            selectionScope={selectionScope}
            handleColumnSelect={handleColumnSelect}
            assignments={assignments}
          />
          {teamWithMembership.membership.role === TeamMembershipRole.OWNER &&
            teamWithMembership.team.useSolver && (
              <DailyShiftDemandRow
                lng={lng}
                shifts={shifts}
                assignments={assignments}
                shiftDemands={shiftDemands}
                periodDates={periodDates}
                scheduleViewSettings={scheduleViewSettings}
              />
            )}
        </TableHead>
        <TableBody>
          {workersForHeader.map((worker, workerIndex) => (
            <WorkerTableRow
              key={workerIndex}
              lng={lng}
              shifts={shifts}
              worker={worker}
              assignments={assignments}
              scheduleCampaign={scheduleCampaign}
              periodDates={periodDates}
              scheduleCellsDict={scheduleCellDict}
              scheduleViewSettings={scheduleViewSettings}
              teamWithMembership={teamWithMembership}
              handleAssignmentSelection={handleAssignmentSelection}
              handleRequestSelection={handleRequestSelection}
              handleOpenCreateAssignment={handleOpenCreateAssignment}
              selectionState={selectionState}
              selectionScope={selectionScope}
              handleCellSelect={handleCellSelect}
              handleAssignmentSelect={handleAssignmentSelect}
              handleRowSelect={handleRowSelect}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
