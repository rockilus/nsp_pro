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
import { DailyShiftDemandT } from "@/types/daily-shift-demand";
import { CreateAssignmentT } from "@/types/assignment";
import { AssignmentT } from "@/types/assignment";

export default function ShiftTableRow({
  shift,
  assignments,
  dailyShiftDemands,
  periodDates,
  scheduleCampaign,
  scheduleCellsDict,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleDemandSelection,
  handleOpenCreateAssignment,
}: {
  shift: ShiftT;
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
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
        shift={shift}
        assignments={assignments}
        dailyShiftDemands={dailyShiftDemands}
        scheduleCampaign={scheduleCampaign}
      />
      {periodDates.map((pDate, dateIndex) => {
        const scheduleCellDataKey = generateOwnerIdDateKey(
          shift.id,
          pDate.date
        );
        const scheduleCellData = scheduleCellsDict[scheduleCellDataKey] || null;
        return (
          <ShiftCell
            key={dateIndex}
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
