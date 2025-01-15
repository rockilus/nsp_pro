import React from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import TableCell from "@mui/material/TableCell";
// Styles
import "./shift-cell.css";
// Types
import { ShiftT } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  AssignmentT,
  BreachT,
  SelectedCellT,
  ScheduleT,
  ScheduleStatus,
} from "../../../../types/schedule";
import { RequestT, RequestStatus } from "../../../../types/request";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function ShiftCell({
  periodDate,
  scheduleCampaign,
  workers,
  shift,
  requests,
  assignments,
  breaches,
  showBreaches,
  handleCellSelection,
}: {
  periodDate: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null };
  scheduleCampaign: ScheduleT | null;
  workers: WorkerT[];
  shift: ShiftT;
  requests: RequestT[];
  assignments: AssignmentT[];
  breaches: BreachT[];
  showBreaches: boolean;
  handleCellSelection: (seletedCell: SelectedCellT) => void;
}) {
  const AssignmentDiv = ({
    assignment,
    worker,
    breaches,
    requests,
    isLastAssignment,
  }: {
    assignment: AssignmentT;
    worker: WorkerT | null;
    breaches: BreachT[];
    requests: RequestT[];
    isLastAssignment: boolean;
  }) => {
    if (!worker) return <div>No assignment</div>;

    const assignmentFixed =
      scheduleCampaign &&
      assignment.scheduleId === scheduleCampaign.id &&
      assignment.fixed;
    const breachHard =
      breaches.some((b) => b.hardToSoft) ||
      requests.some(
        (r) => r.hard && r.status === RequestStatus.REJECTED && r.active
      );
    const breachSoft =
      !breachHard &&
      (breaches.some((b) => !b.hardToSoft) ||
        requests.some(
          (r) => !r.hard && r.status === RequestStatus.REJECTED && r.active
        ));
    return (
      <div
        className={`assignment-div-container ${
          isLastAssignment ? "last" : ""
        } ${
          showBreaches && breachHard
            ? "hard-breach"
            : showBreaches && breachSoft
            ? "soft-breach"
            : ""
        }`}
        onClick={() =>
          handleCellSelection({
            assignment: assignment,
            worker: worker,
            shift: shift,
            requests: requests,
            breaches: breaches,
          })
        }
      >
        <span className={`worker-name-cell ${assignmentFixed ? "fix" : ""}`}>
          {worker.acronym}
        </span>
      </div>
    );
  };

  const CellContent = ({}) => {
    const assignmentsShiftDate = assignments.filter(
      (a) => a.shiftId === shift.id && a.date.isSame(periodDate.date, "day")
    );

    return (
      <div className="cell-content-container">
        {assignmentsShiftDate.map((a, aIndex) => {
          const workerAssign = workers.find((w) => w.id === a.workerId) || null;
          const breachesAssign = breaches.filter((b) =>
            b.variables.find(
              (v) => v.workerId === a.workerId && v.date.isSame(a.date, "day")
            )
          );
          const requestsAssign = requests.filter(
            (r) =>
              r.workerId === a.workerId &&
              r.startDate.isSameOrBefore(a.date, "day") &&
              r.endDate.isSameOrAfter(a.date, "day")
          );

          return (
            <AssignmentDiv
              key={aIndex}
              assignment={a}
              worker={workerAssign}
              breaches={breachesAssign}
              requests={requestsAssign}
              isLastAssignment={aIndex === assignmentsShiftDate.length - 1}
            />
          );
        })}
      </div>
    );
  };

  return (
    <TableCell
      sx={{
        align: "center",
        borderRight: "1px solid #e0e0e07d",
        padding: 0,
      }}
    >
      <CellContent />
    </TableCell>
  );
}
