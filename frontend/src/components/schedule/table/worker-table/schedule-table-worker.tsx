import React from "react";
import dayjs from "dayjs";
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
import { ShiftDemandDTO, ShiftDemandMatrix } from "@/types/shiftDemand";
import { CreateAssignmentT } from "@/types/assignment";
import { AssignmentDataDictT } from "@/types/assignment";
import { AssignmentT } from "@/types/assignment";
import { RequestT } from "../../../../types/request";
import { AttributeOwnerType } from "../../../../types/attribute";
import { RecurrenceRuleT } from "@/types/recurrence";
import { TeamMembershipRole, TeamWithMembership } from "@/types/team";

export default function ScheduleTableWorker({
  lng,
  teamWithMembership,
  shifts,
  workers,
  requests,
  assignments,
  shiftDemands,
  shiftDemandMatrix,
  recurrences,
  scheduleCampaign,
  periodDates,
  breaches,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleCreateShiftDemand,
  handleUpdateShiftDemand,
  handleDeleteShiftDemand,
  handleExportSchedule,
  handleOpenCreateAssignment,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  shifts: ShiftT[];
  workers: WorkerT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  shiftDemands: ShiftDemandDTO[];
  shiftDemandMatrix: ShiftDemandMatrix;
  recurrences: RecurrenceRuleT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  breaches: BreachT[];
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (selectedCell: AssignmentDataDictT) => void;
  handleCreateShiftDemand: (
    shiftId: string,
    date: dayjs.Dayjs,
    count: number,
    notes?: string
  ) => Promise<void>;
  handleUpdateShiftDemand: (
    demandId: string,
    updates: Partial<{ count: number; notes: string | null }>
  ) => Promise<void>;
  handleDeleteShiftDemand: (demandId: string) => Promise<void>;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
}) {
  const workersForHeader = getRelevantWorkers(
    workers,
    assignments,
    scheduleCampaign
  );

  const scheduleCellDict = buildScheduleCellDict(
    AttributeOwnerType.WORKER,
    assignments,
    [], // Pass empty array for legacy compatibility
    recurrences,
    requests,
    workers,
    shifts,
    breaches
  );

  return (
    <TableContainer
      component={Paper}
      style={{ width: "100%", height: "calc(100vh - 104px)" }}
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
          />
          {teamWithMembership.membership.role === TeamMembershipRole.OWNER &&
            teamWithMembership.team.useSolver && (
              <DailyShiftDemandRow
                lng={lng}
                teamId={teamWithMembership.team.id}
                shifts={shifts}
                assignments={assignments}
                shiftDemands={shiftDemands}
                scheduleCampaign={scheduleCampaign}
                periodDates={periodDates}
                scheduleViewSettings={scheduleViewSettings}
                handleCreateDSD={handleCreateShiftDemand}
                handleUpdateDSD={handleUpdateShiftDemand}
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
              handleAssignmentSelection={handleAssignmentSelection}
              handleOpenCreateAssignment={handleOpenCreateAssignment}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
