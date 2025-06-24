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
import { ShiftDemandDTO, ShiftDemandMatrix } from "@/types/shiftDemand";
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
  shiftDemandMatrix,
  recurrences,
  scheduleCampaign,
  periodDates,
  breaches,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleDemandSelection,
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
  handleAssignmentSelection: (selectedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
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
  const shiftsForHeader = getRelevantShifts(shifts, assignments);

  // Convert ShiftDemandDTO to legacy format for compatibility with existing utility functions
  const dailyShiftDemands = shiftDemands.map((demand) => ({
    id: demand.id,
    teamId: demand.teamId,
    scheduleId: scheduleCampaign?.id || "",
    shiftDemandId: null,
    coverageSelectorId: null,
    sourceType: 0, // DSDSourceType.SHIFT_DEMAND
    date: dayjs.unix(demand.date),
    shiftId: demand.shiftId,
    count: demand.count,
    notes: demand.notes,
  }));

  // Handler converters for legacy compatibility
  const handleCreateDSD = async (legacyDemand: any) => {
    await handleCreateShiftDemand(
      legacyDemand.shiftId,
      legacyDemand.date,
      legacyDemand.count,
      legacyDemand.notes || ""
    );
  };

  const handleUpdateDSD = async (legacyDemand: any) => {
    await handleUpdateShiftDemand(legacyDemand.id, {
      count: legacyDemand.count,
      notes: legacyDemand.notes || null,
    });
  };

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
          {teamWithMembership.membership.role === TeamMembershipRole.OWNER &&
            teamWithMembership.team.useSolver && (
              <DailyShiftDemandRow
                lng={lng}
                teamId={teamWithMembership.team.id}
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
