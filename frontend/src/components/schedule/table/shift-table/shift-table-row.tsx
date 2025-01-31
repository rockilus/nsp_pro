import React from "react";
import dayjs from "dayjs";
// MUI
import TableRow from "@mui/material/TableRow";
// Components
import ShiftRowHeaderCell from "./shift-row-header-cell";
import ShiftCell from "./shift-cell";
// Types
import { ShiftT } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  AssignmentT,
  ScheduleT,
  BreachT,
  AssignmentDataDictT,
  DailyShiftDemandT,
  ScheduleStatus,
} from "../../../../types/schedule";
import { RequestT } from "../../../../types/request";

export default function ShiftTableRow({
  shift,
  workers,
  requests,
  assignments,
  dailyShiftDemands,
  periodDates,
  scheduleCampaign,
  breaches,
  showBreaches,
  handleCellSelection,
}: {
  shift: ShiftT;
  workers: WorkerT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  periodDates: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null }[];
  scheduleCampaign: ScheduleT | null;
  breaches: BreachT[];
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
          workers={workers}
          shift={shift}
          requests={requests}
          assignments={assignments}
          breaches={breaches}
          showBreaches={showBreaches}
          handleCellSelection={handleCellSelection}
        />
      ))}
    </TableRow>
  );
}
