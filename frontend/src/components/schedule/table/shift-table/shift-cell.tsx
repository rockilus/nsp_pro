import React from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import TableCell from "@mui/material/TableCell";
// Utils
import { getBreachType } from "../../../data-display/schedule-utils";
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
} from "../../../../types/schedule";
import { RequestT } from "../../../../types/request";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function ShiftCell({
  date,
  schedule,
  workers,
  shift,
  requests,
  assignments,
  breaches,
  showBreaches,
  selectedDisplay,
  handleCellSelection,
}: {
  date: dayjs.Dayjs;
  schedule: ScheduleT;
  workers: WorkerT[];
  shift: ShiftT;
  requests: RequestT[];
  assignments: AssignmentT[];
  breaches: BreachT[];
  showBreaches: boolean;
  selectedDisplay: string;
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
    worker: WorkerT;
    breaches: BreachT[];
    requests: RequestT[];
    isLastAssignment: boolean;
  }) => {
    const assignmentFixed =
      assignment.scheduleId === schedule.id && assignment.fixed;
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
          assignmentFixed ? "fix" : isLastAssignment ? "last" : ""
        }${
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
        <span className="worker-name">{worker.name}</span>
      </div>
    );
  };

  const CellContent = ({}) => {
    const targetAs = assignments.filter(
      (a) => a.shiftId === shift.id && a.date.isSame(date, "date")
    );
    if (targetAs.length === 0) return <div>No assignment</div>;
    return (
      <div className="cell-content-container">
        {targetAs.map((a, aIndex) => {
          const worker = workers.find((w) => w.id === a.workerId) || null;
          const targetBs = breaches.filter((b) =>
            b.variables.find(
              (v) => v.workerId === a.workerId && v.date.isSame(a.date, "date")
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
            <AssignmentDiv
              key={aIndex}
              assignment={a}
              worker={worker}
              breaches={targetBs}
              requests={targetRequests}
              isLastAssignment={aIndex === targetAs.length - 1}
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
      {/* <Box
        onClick={() =>
          handleCellSelection({
            assignment: assignment,
            worker: worker,
            shift: shift,
            requests: requests,
            breaches: breaches,
          })
        }
        sx={{
          width: "100%",
          height: "100%",
          backgroundColor: showBreaches
            ? backColor === "hardBreach"
              ? red[200]
              : backColor === "softBreach"
              ? red[100]
              : "none"
            : "none",
          border:
            assignment.status === "wip" && assignment.fixed
              ? "3px solid #bdbdbd"
              : "none",
          cursor: "pointer",
          color: assignment.date.isBefore(dayjs(), "day")
            ? "black"
            : selectedDisplay === "shift"
            ? worker.deleted
              ? "red"
              : "black"
            : selectedDisplay === "worker"
            ? shift.deleted
              ? "red"
              : "black"
            : "black",
        }}
      >
        {selectedDisplay === "worker" && assignment && shift && shift.name}
        {selectedDisplay === "shift" && assignment && worker && worker.name}
      </Box> */}
    </TableCell>
  );
}
