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
import ShiftTableRow from "./shift-table-row";
import { buildScheduleCellDict } from "../shared/assignment-utils";
import { getRelevantShifts } from "./shift-table-utils";
import { RoleBased } from "../../../access/role-based";
// Types
import { ShiftT } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  ScheduleT,
  ExportOptionsT,
  periodDateT,
  AssignmentDataT,
  ScheduleCellDataT,
  ScheduleViewSettingsT,
} from "../../../../types/schedule";
import { BreachT } from "@/types/breach";
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { AssignmentT, CreateAssignmentT } from "@/types/assignment";
import { RequestT } from "../../../../types/request";
import { AttributeOwnerType } from "../../../../types/attribute";
import { RecurrenceRuleT } from "@/types/recurrence";
import { TeamMembershipRole, TeamWithMembership } from "@/types/team";

export default function ScheduleTableShift({
  lng,
  teamWithMembership,
  shifts,
  workers,
  requests,
  assignments,
  // scheduleId,
  shiftDemands,
  recurrences,
  scheduleCampaign,
  periodDates,
  breaches,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleDemandSelection,
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
  recurrences: RecurrenceRuleT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  breaches: BreachT[];
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (selectedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
}) {
  const shiftsForHeader = getRelevantShifts(shifts, assignments);

  const scheduleCellDict = buildScheduleCellDict(
    AttributeOwnerType.SHIFT,
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
      data-testid="schedule-table-shift"
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
            teamWithMembership={teamWithMembership}
            periodDates={periodDates}
            scheduleCampaign={scheduleCampaign}
            handleExportSchedule={handleExportSchedule}
          />
          <RoleBased
            role={teamWithMembership.membership.role}
            allowedRoles={[TeamMembershipRole.OWNER]}
          >
            {teamWithMembership.team.useSolver && (
              <DailyShiftDemandRow
                lng={lng}
                shifts={shifts}
                assignments={assignments}
                shiftDemands={shiftDemands}
                periodDates={periodDates}
                scheduleViewSettings={scheduleViewSettings}
              />
            )}
          </RoleBased>
        </TableHead>
        <TableBody>
          {shiftsForHeader.map((shift, shiftIndex) => (
            <ShiftTableRow
              key={shiftIndex}
              lng={lng}
              teamWithMembership={teamWithMembership}
              shift={shift}
              assignments={assignments}
              shiftDemands={shiftDemands}
              periodDates={periodDates}
              scheduleCampaign={scheduleCampaign}
              scheduleCellsDict={scheduleCellDict}
              scheduleViewSettings={scheduleViewSettings}
              handleAssignmentSelection={handleAssignmentSelection}
              handleDemandSelection={handleDemandSelection}
              handleOpenCreateAssignment={handleOpenCreateAssignment}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
