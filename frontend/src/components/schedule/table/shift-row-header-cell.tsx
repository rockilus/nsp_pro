import React from "react";
// MUI
import TableCell from "@mui/material/TableCell";
// Styles
import "./shift-row-header-cell.css";
// Types
import { ShiftT } from "../../../types/shift";
import {
  AssignmentT,
  DailyShiftDemandT,
  ScheduleT,
} from "../../../types/schedule";

export default function ShiftRowHeaderCell({
  shift,
  assignments,
  dailyShiftDemands,
  schedule,
}: {
  shift: ShiftT;
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  schedule: ScheduleT;
}) {
  const shiftCountActual = assignments.filter(
    (assignment) =>
      assignment.shiftId === shift.id &&
      assignment.date.isSameOrAfter(schedule.startDate, "day") &&
      assignment.date.isSameOrBefore(schedule.endDate, "day")
  ).length;
  const shiftCountTarget = dailyShiftDemands
    .filter(
      (dsd) =>
        dsd.shiftId === shift.id &&
        dsd.date.isSameOrAfter(schedule.startDate, "day") &&
        dsd.date.isSameOrBefore(schedule.endDate, "day")
    )
    .reduce((sum, dsd) => sum + dsd.count, 0);

  return (
    <TableCell
      sx={{
        position: "sticky",
        left: 0,
        backgroundColor: "#FFFFFF",
        padding: 0,
      }}
    >
      <div className="shift-row-header-cell-container">
        <div className="shift-row-header-cell-left">
          <span className="shift-name">{shift.name}</span>
          <span
            className={`shift-stats-total ${
              shiftCountActual !== shiftCountTarget && "breach"
            }`}
          >
            {`${shiftCountActual} / ${shiftCountTarget}`}
          </span>
        </div>
        <div className="shift-row-header-cell-right">
          <span className="shift-time">{shift.startTime.format("HH:mm")}</span>
          <span className="shift-time">
            {shift.endTime.format("HH:mm")}
            {!shift.endTime.isSame(shift.startTime, "day") && <sup>+1</sup>}
          </span>
        </div>
      </div>
    </TableCell>
  );
}
