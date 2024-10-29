import React from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
// Components
import ScheduleTableCellContent from "../schedule-table-cell-content";
import ShiftRowHeaderCell from "./shift-row-header-cell";
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

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

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
      {periodDates.map((date, dateIndex) => {
        const targetAs = assignments.filter(
          (a) => a.shiftId === shift.id && a.date.isSame(date, "date")
        );

        return (
          <TableCell
            key={dateIndex}
            sx={{
              align: "center",
            }}
          >
            {targetAs.map((a, aIndex) => {
              const worker = workers.find((w) => w.id === a.workerId) || null;
              const targetBs = breaches.filter((b) =>
                b.variables.find(
                  (v) =>
                    v.workerId === a.workerId && v.date.isSame(a.date, "date")
                  // v.shiftId === a.shiftId
                )
              );
              const targetRequests = requests.filter(
                (r) =>
                  r.workerId === a.workerId &&
                  r.startDate.isSameOrBefore(a.date, "date") &&
                  r.endDate.isSameOrAfter(a.date, "date")
              );
              return (
                worker && (
                  <ScheduleTableCellContent
                    key={aIndex}
                    worker={worker}
                    shift={shift}
                    requests={targetRequests}
                    assignment={a}
                    breaches={targetBs}
                    showBreaches={showBreaches}
                    selectedDisplay={selectedDisplay}
                    handleCellSelection={handleCellSelection}
                  />
                )
              );
            })}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
