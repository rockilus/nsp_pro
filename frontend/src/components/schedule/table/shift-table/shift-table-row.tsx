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
import { WorkerT } from "../../../../types/worker";

export default function ShiftTableRow({
  shift,
  assignments,
  dailyShiftDemands,
  periodDates,
  scheduleCampaign,
  shiftIdDateToAssignData,
  showBreaches,
  handleCellSelection,
  handleOpenCreateAssignment,
}: {
  shift: ShiftT;
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  periodDates: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null }[];
  scheduleCampaign: ScheduleT | null;
  shiftIdDateToAssignData: AssignmentDictT;
  showBreaches: boolean;
  handleCellSelection: (selectedCell: AssignmentDataDictT) => void;
  handleOpenCreateAssignment: (
    scheduleId: string,
    worker: WorkerT | null,
    shift: ShiftT | null,
    date: dayjs.Dayjs | null
  ) => void;
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
          handleOpenCreateAssignment={handleOpenCreateAssignment}
        />
      ))}
    </TableRow>
  );
}
