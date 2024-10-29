import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
// Components
import ScheduleTableCellContent from "../schedule-table-cell-content";
import WorkerRowHeaderCell from "./worker-row-header-cell";
// Types
import { ShiftT } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  AssignmentT,
  BreachT,
  ScheduleT,
  SelectedCellT,
} from "../../../../types/schedule";
import { RequestT } from "../../../../types/request";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function WorkerTableRow({
  lng,
  shifts,
  worker,
  requests,
  assignments,
  schedule,
  dates,
  breaches,
  showBreaches,
  selectedDisplay,
  handleCellSelection,
}: {
  lng: string;
  shifts: ShiftT[];
  worker: WorkerT;
  requests: RequestT[];
  assignments: AssignmentT[];
  schedule: ScheduleT;
  dates: dayjs.Dayjs[];
  breaches: BreachT[];
  showBreaches: boolean;
  selectedDisplay: string;
  handleCellSelection: (selectedCell: SelectedCellT) => void;
}) {
  return (
    <TableRow>
      <WorkerRowHeaderCell
        lng={lng}
        shifts={shifts}
        worker={worker}
        assignments={assignments}
        schedule={schedule}
      />
      {dates.map((date, dateIndex) => {
        const targetAs = assignments.filter(
          (a) => a.workerId === worker.id && a.date.isSame(date, "date")
        );

        return (
          <TableCell
            key={dateIndex}
            sx={{
              align: "center",
            }}
          >
            {targetAs.map((a, aIndex) => {
              const shift = shifts.find((s) => s.id === a.shiftId);
              const targetBs = breaches.filter((b) =>
                b.variables.find(
                  (v) =>
                    v.workerId === a.workerId && v.date.isSame(a.date, "date")
                )
              );
              const targetRequests = requests.filter(
                (r) =>
                  r.workerId === a.workerId &&
                  r.startDate.isSameOrBefore(a.date, "date") &&
                  r.endDate.isSameOrAfter(a.date, "date")
              );
              return (
                shift && (
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
