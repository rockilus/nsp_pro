import React from "react";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import { countShiftsTotalPeriod } from "../shared/assignment-count-methods";
// Styles
import "./shift-row-header-cell.css";
// Types
import { ShiftT, ShiftType } from "../../../../types/shift";
import {
  AssignmentT,
  DailyShiftDemandT,
  ScheduleT,
} from "../../../../types/schedule";

export default function ShiftRowHeaderCell({
  shift,
  assignments,
  dailyShiftDemands,
  scheduleCampaign: scheduleCampaign,
}: {
  shift: ShiftT;
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  scheduleCampaign: ScheduleT | null;
}) {
  const { countActual: shiftCountActual, countTarget: shiftCountTarget } =
    scheduleCampaign
      ? countShiftsTotalPeriod(
          [shift],
          assignments,
          dailyShiftDemands,
          scheduleCampaign.startDate,
          scheduleCampaign.endDate
        )
      : { countActual: 0, countTarget: 0 };

  return (
    <TableCell
      sx={{
        position: "sticky",
        left: 0,
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid #e0e0e07d",
        padding: 0,
      }}
    >
      <div className="shift-row-header-cell-container">
        <div
          className={`shift-type-marker ${
            shift.shiftType === ShiftType.DUTY ? "duty" : "other"
          }`}
        ></div>
        <div className="shift-row-header-cell-left">
          <span className="shift-name">{shift.acronym}</span>
          {scheduleCampaign && (
            <span
              className={`shift-stats-total ${
                shiftCountActual !== shiftCountTarget && "breach"
              }`}
            >
              {`${shiftCountActual} / ${shiftCountTarget}`}
            </span>
          )}
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
