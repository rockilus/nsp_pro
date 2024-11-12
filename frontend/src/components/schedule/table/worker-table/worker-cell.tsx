import React from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import TableCell from "@mui/material/TableCell";
// Styles
import "./worker-cell.css";
// Types
import { ShiftT, ShiftType } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  AssignmentT,
  BreachT,
  SelectedCellT,
  ScheduleT,
  ScheduleStatus,
} from "../../../../types/schedule";
import { RequestT } from "../../../../types/request";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function WorkerCell({
  periodDate,
  scheduleCampaign,
  worker,
  shifts,
  requests,
  assignments,
  breaches,
  showBreaches,
  handleCellSelection,
}: {
  periodDate: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null };
  scheduleCampaign: ScheduleT | null;
  worker: WorkerT;
  shifts: ShiftT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  breaches: BreachT[];
  showBreaches: boolean;
  handleCellSelection: (seletedCell: SelectedCellT) => void;
}) {
  const AssignmentDiv = ({
    assignment,
    shift,
    breaches,
    requests,
    isLastAssignment,
  }: {
    assignment: AssignmentT;
    shift: ShiftT | null;
    breaches: BreachT[];
    requests: RequestT[];
    isLastAssignment: boolean;
  }) => {
    if (!shift) return <div>No assignment</div>;

    const assignmentFixed =
      scheduleCampaign &&
      assignment.scheduleId === scheduleCampaign.id &&
      assignment.fixed;
    const breachHard =
      breaches.some((b) => b.hardToSoft) ||
      requests.some((r) => r.hard && r.status === "rejected" && r.active);
    const breachSoft =
      !breachHard &&
      (breaches.some((b) => !b.hardToSoft) ||
        requests.some((r) => !r.hard && r.status === "rejected" && r.active));
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
        <span className={`shift-name-cell ${assignmentFixed ? "fix" : ""}`}>
          {shift.name}
        </span>
        <div className="shift-times-container">
          <span className="shift-times-cell">
            {shift.startTime.format("HH:mm")}
          </span>
          <span className="shift-times-cell">{" - "}</span>
          <span className="shift-times-cell">
            {shift.endTime.format("HH:mm")}
            {!shift.endTime.isSame(shift.startTime, "day") && <sup>+1</sup>}
          </span>
        </div>
        <div
          className={`w-shift-type-marker ${
            shift.shiftType === ShiftType.DUTY ? "duty" : "other"
          }`}
        ></div>
      </div>
    );
  };

  const CellContent = ({}) => {
    const assignmentsWorkerDate = assignments.filter(
      (a) => a.workerId === worker.id && a.date.isSame(periodDate.date, "day")
    );

    return (
      <div className="cell-content-container">
        {assignmentsWorkerDate.map((a, aIndex) => {
          const shiftAssign = shifts.find((s) => s.id === a.shiftId) || null;
          const breachesAssign = breaches.filter((b) =>
            b.variables.find(
              (v) => v.shiftId === a.shiftId && v.date.isSame(a.date, "day")
            )
          );
          const requestsAssign = requests.filter(
            (r) =>
              r.shiftId === a.shiftId &&
              r.startDate.isSameOrBefore(a.date, "day") &&
              r.endDate.isSameOrAfter(a.date, "day")
          );

          return (
            <AssignmentDiv
              key={aIndex}
              assignment={a}
              shift={shiftAssign}
              breaches={breachesAssign}
              requests={requestsAssign}
              isLastAssignment={aIndex === assignmentsWorkerDate.length - 1}
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
