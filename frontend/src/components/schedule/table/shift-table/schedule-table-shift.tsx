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
import ShiftTableRow from "./shift-table-row";
import { buildScheduleCellDict } from "../shared/assignment-utils";
import { getRelevantShifts } from "./shift-table-utils";
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
import { DailyShiftDemandT } from "@/types/daily-shift-demand";
import { AssignmentT, CreateAssignmentT } from "@/types/assignment";
import { RequestT } from "../../../../types/request";
import { AttributeOwnerType } from "../../../../types/attribute";
import { RecurrenceRuleT } from "@/types/recurrence";
import { TeamMembershipRole } from "@/types/team";

export default function ScheduleTableShift({
  lng,
  teamId,
  userTeamRole,
  shifts,
  workers,
  requests,
  assignments,
  // scheduleId,
  dailyShiftDemands,
  recurrences,
  scheduleCampaign,
  periodDates,
  breaches,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleDemandSelection,
  handleCreateDSD,
  handleUpdateDSD,
  handleExportSchedule,
  handleOpenCreateAssignment,
}: {
  lng: string;
  teamId: string;
  userTeamRole: TeamMembershipRole;
  shifts: ShiftT[];
  workers: WorkerT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  recurrences: RecurrenceRuleT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  breaches: BreachT[];
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (selectedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
}) {
  const shiftsForHeader = getRelevantShifts(shifts, assignments);
  const scheduleCellDict = buildScheduleCellDict(
    AttributeOwnerType.SHIFT,
    assignments,
    dailyShiftDemands,
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
          {userTeamRole === TeamMembershipRole.OWNER && (
            <DailyShiftDemandRow
              lng={lng}
              teamId={teamId}
              shifts={shifts}
              assignments={assignments}
              dailyShiftDemands={dailyShiftDemands}
              scheduleCampaign={scheduleCampaign}
              periodDates={periodDates}
              scheduleViewSettings={scheduleViewSettings}
              handleCreateDSD={handleCreateDSD}
              handleUpdateDSD={handleUpdateDSD}
            />
          )}
        </TableHead>
        <TableBody>
          {shiftsForHeader.map((shift, shiftIndex) => (
            <ShiftTableRow
              key={shiftIndex}
              shift={shift}
              assignments={assignments}
              dailyShiftDemands={dailyShiftDemands}
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
