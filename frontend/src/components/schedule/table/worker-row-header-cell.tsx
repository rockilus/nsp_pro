import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import TableCell from "@mui/material/TableCell";
// Styles
import "./worker-row-header-cell.css";
// Types
import { ShiftT, ShiftType } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { AssignmentT, ScheduleT } from "../../../types/schedule";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function WorkerRowHeaderCell({
  lng,
  shifts,
  worker,
  assignments,
  schedule,
}: {
  lng: string;
  shifts: ShiftT[];
  worker: WorkerT;
  assignments: AssignmentT[];
  schedule: ScheduleT;
}) {
  const assignmentsWorker = assignments.filter(
    (assignment) =>
      assignment.workerId === worker.id &&
      assignment.date.isSameOrAfter(schedule.startDate, "day") &&
      assignment.date.isSameOrBefore(schedule.endDate, "day")
  );

  const shiftMap: { [key: string]: ShiftT } = shifts.reduce((map, shift) => {
    map[shift.id] = shift;
    return map;
  }, {} as { [key: string]: ShiftT });

  const calcWeeklyWorkTimeActual = () => {
    const workerTotalWorkTimeActual = assignmentsWorker.reduce(
      (acc, assignment) => {
        const shift = shiftMap[assignment.shiftId];
        if (shift) {
          const duration = shift.endTime.diff(shift.startTime, "hour", true);
          return acc + duration;
        }
        return acc;
      },
      0
    );
    const numWeeksSchedule =
      (schedule.endDate.diff(schedule.startDate, "day") + 1) / 7;
    return workerTotalWorkTimeActual / numWeeksSchedule;
  };

  const calcDutiesPerMonthActual = () => {
    const workerTotalDutiesActual = assignmentsWorker.reduce(
      (acc, assignment) => {
        const shift = shiftMap[assignment.shiftId];
        if (shift && shift.shiftType === ShiftType.DUTY) {
          return acc + 1;
        }
        return acc;
      },
      0
    );
    const numMonthsSchedule = schedule.endDate.diff(
      schedule.startDate,
      "month",
      true
    );
    return workerTotalDutiesActual / numMonthsSchedule;
  };

  const workerWeeklyWorkTimeActual = calcWeeklyWorkTimeActual();
  const workerDutiesPerMonthActual = calcDutiesPerMonthActual();

  return (
    <TableCell
      sx={{
        position: "sticky",
        left: 0,
        backgroundColor: "#FFFFFF",
        padding: 0,
      }}
    >
      <div className="worker-row-header-cell-container">
        <span className="worker-name">{worker.name}</span>
        <div className="worker-stats-item">
          <span className="worker-stats-label">Work time:</span>
          <div
            className={`worker-stats-container ${
              workerWeeklyWorkTimeActual > worker.weeklyHoursDesired && "breach"
            }`}
          >
            <span className="worker-stats">
              {workerWeeklyWorkTimeActual.toFixed(1)}
            </span>
            <span className="worker-stats-slash">/</span>
            <span className="worker-stats">{worker.weeklyHoursDesired}</span>
          </div>
        </div>
        <div className="worker-stats-item">
          <span className="worker-stats-label">Nb duties:</span>
          <div
            className={`worker-stats-container ${
              workerDutiesPerMonthActual > worker.dutiesPerMonth && "breach"
            }`}
          >
            <span className="worker-stats">
              {workerDutiesPerMonthActual.toFixed(1)}
            </span>
            <span className="worker-stats-slash">/</span>
            <span className="worker-stats">{worker.dutiesPerMonth}</span>
          </div>
        </div>
      </div>
    </TableCell>
  );
}
