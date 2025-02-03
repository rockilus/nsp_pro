import React from "react";
import dayjs from "dayjs";
// MUI
import TableRow from "@mui/material/TableRow";
// Components
import ShiftRowHeaderCell from "./shift-row-header-cell";
import ShiftCell from "./shift-cell";
// Types
import { ShiftT } from "../../../../types/shift";
import {
  AssignmentT,
  ScheduleT,
  AssignmentDataDictT,
  DailyShiftDemandT,
  ScheduleStatus,
  AssignmentDictT,
} from "../../../../types/schedule";

export default function ShiftTableRow({
  shift,
  assignments,
  dailyShiftDemands,
  periodDates,
  scheduleCampaign,
  shiftIdDateToAssignData,
  showBreaches,
  handleCellSelection,
}: {
  shift: ShiftT;
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  periodDates: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null }[];
  scheduleCampaign: ScheduleT | null;
  shiftIdDateToAssignData: AssignmentDictT;
  showBreaches: boolean;
  handleCellSelection: (selectedCell: AssignmentDataDictT) => void;
}) {
  return (
    <TableRow>
      <ShiftRowHeaderCell
        shift={shift}
        assignments={assignments}
        dailyShiftDemands={dailyShiftDemands}
        scheduleCampaign={scheduleCampaign}
      />
      {periodDates.map((pDate, dateIndex) => (
        <ShiftCell
          key={dateIndex}
          periodDate={pDate}
          scheduleCampaign={scheduleCampaign}
          shift={shift}
          shiftIdDateToAssignData={shiftIdDateToAssignData}
          showBreaches={showBreaches}
          handleCellSelection={handleCellSelection}
        />
      ))}
    </TableRow>
  );
}
