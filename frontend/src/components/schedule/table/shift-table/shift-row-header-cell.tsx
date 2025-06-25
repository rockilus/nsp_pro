import React from "react";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import { countShiftsTotalPeriod } from "../shared/assignment-count-methods";
// Styles
import "./shift-row-header-cell.css";
// Types
import { ShiftT, ShiftType } from "../../../../types/shift";
import { ScheduleT } from "../../../../types/schedule";
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { AssignmentT } from "@/types/assignment";
// Constants
import { ShiftColorMappings } from "../../../../constants/constants";
import { TeamWithMembership } from "@/types/team";

export default function ShiftRowHeaderCell({
  teamWithMembership,
  shift,
  assignments,
  shiftDemands,
  scheduleCampaign: scheduleCampaign,
}: {
  teamWithMembership: TeamWithMembership;
  shift: ShiftT;
  assignments: AssignmentT[];
  shiftDemands: ShiftDemandDTO[];
  scheduleCampaign: ScheduleT | null;
}) {
  const { background, sample, text } = ShiftColorMappings[shift.color] || {
    background: "#f5f5f5",
    sample: "#9e9e9e",
    text: "#212121",
  };

  const { countActual: shiftCountActual, countTarget: shiftCountTarget } =
    scheduleCampaign
      ? countShiftsTotalPeriod(
          [shift],
          assignments,
          shiftDemands,
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
          style={{ "--bg-color": sample } as React.CSSProperties}
        ></div>
        <div className="shift-row-header-cell-left">
          <span className="shift-name">{`${shift.name} (${shift.acronym})`}</span>
          {teamWithMembership.team.useSolver && scheduleCampaign && (
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
