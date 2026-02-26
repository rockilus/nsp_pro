import React from "react";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import TableCell from "@mui/material/TableCell";
import Tooltip from "@mui/material/Tooltip";
// Components
import { countShiftsTotalPeriod } from "../shared/assignment-count-methods";
import { RoleBased } from "@/components/access/role-based";
// Styles
import "./shift-row-header-cell.css";
// Types
import { ShiftT, ShiftType } from "../../../../types/shift";
import { ScheduleT } from "../../../../types/schedule";
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { AssignmentT } from "@/types/assignment";
import { TeamMembershipRole } from "@/types/team";
// Constants
import { ShiftColorMappings } from "../../../../constants/constants";
import { TeamWithMembership } from "@/types/team";

export default function ShiftRowHeaderCell({
  lng,
  teamWithMembership,
  shift,
  assignments,
  shiftDemands,
  scheduleCampaign: scheduleCampaign,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  shift: ShiftT;
  assignments: AssignmentT[];
  shiftDemands: ShiftDemandDTO[];
  scheduleCampaign: ScheduleT | null;
}) {
  const { t } = useTranslation(lng, "schedule-page");
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
          scheduleCampaign.endDate,
        )
      : { countActual: 0, countTarget: 0 };

  return (
    <TableCell
      data-testid={`shift-row-header-${shift.id}`}
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
          <span
            className="shift-name"
            data-testid={`shift-name-${shift.id}`}
          >{`${shift.name} (${shift.acronym})`}</span>
          <RoleBased
            role={teamWithMembership.membership.role}
            allowedRoles={[TeamMembershipRole.OWNER]}
          >
            {teamWithMembership.team.useSolver && scheduleCampaign && (
              <Tooltip title={t("shift_count_tooltip")} placement="right" arrow>
                <span
                  className={`shift-stats-total ${
                    shiftCountActual !== shiftCountTarget && "breach"
                  }`}
                  data-testid={`shift-count-${shift.id}`}
                >
                  {`${shiftCountActual} / ${shiftCountTarget}`}
                </span>
              </Tooltip>
            )}
          </RoleBased>
        </div>
        <div className="shift-row-header-cell-right">
          <span
            className="shift-time"
            data-testid={`shift-time-start-${shift.id}`}
          >
            {shift.startTime.format("HH:mm")}
          </span>
          <span
            className="shift-time"
            data-testid={`shift-time-end-${shift.id}`}
          >
            {shift.endTime.format("HH:mm")}
            {!shift.endTime.isSame(shift.startTime, "day") && <sup>+1</sup>}
          </span>
        </div>
      </div>
    </TableCell>
  );
}
