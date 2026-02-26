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
  handleAssignmentSelection,
  handleDemandSelection,
  handleOpenCreateAssignment,
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
  handleAssignmentSelection: (selectedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
}) {
  return (
    <TableRow>
      <ShiftRowHeaderCell
        teamWithMembership={teamWithMembership}
        shift={shift}
        assignments={assignments}
        shiftDemands={shiftDemands}
        scheduleCampaign={scheduleCampaign}
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
            handleAssignmentSelection={handleAssignmentSelection}
            handleDemandSelection={handleDemandSelection}
            handleOpenCreateAssignment={handleOpenCreateAssignment}
          />
        );
      })}
    </TableRow>
  );
}
