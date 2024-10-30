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
  SelectedCellT,
  DailyShiftDemandT,
} from "../../../../types/schedule";
import { RequestT } from "../../../../types/request";

export default function ShiftTableRow({
  shift,
  workers,
  requests,
  assignments,
  dailyShiftDemands,
  periodDates,
  schedule,
  breaches,
  showBreaches,
  selectedDisplay,
  handleCellSelection,
}: {
  shift: ShiftT;
  workers: WorkerT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  periodDates: dayjs.Dayjs[];
  schedule: ScheduleT;
  breaches: BreachT[];
  showBreaches: boolean;
  selectedDisplay: string;
  handleCellSelection: (selectedCell: SelectedCellT) => void;
}) {
  return (
    <TableRow>
      <ShiftRowHeaderCell
        shift={shift}
        assignments={assignments}
        dailyShiftDemands={dailyShiftDemands}
        schedule={schedule}
      />
      {periodDates.map((date, dateIndex) => (
        <ShiftCell
          key={dateIndex}
          date={date}
          schedule={schedule}
          workers={workers}
          shift={shift}
          requests={requests}
          assignments={assignments}
          breaches={breaches}
          showBreaches={showBreaches}
          selectedDisplay={selectedDisplay}
          handleCellSelection={handleCellSelection}
        />
      ))}
    </TableRow>
  );
}
