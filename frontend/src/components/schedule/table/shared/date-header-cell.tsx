import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import { RoleBased } from "../../../access/role-based";
// Styles
import "./date-header-cell.css";
// Types
import { ScheduleStatus, periodDateT } from "../../../../types/schedule";
import { TeamMembershipRole, TeamWithMembership } from "@/types/team";

dayjs.extend(utc);
type ScheduleStatusLogoProps = {
  scheduleStatus: ScheduleStatus | null;
};

const ScheduleStatusLogo: React.FC<ScheduleStatusLogoProps> = ({
  scheduleStatus,
}) => {
  if (scheduleStatus === null) return null;

  const containerClass =
    scheduleStatus === ScheduleStatus.VALIDATED
      ? "validated"
      : scheduleStatus === ScheduleStatus.CAMPAIGN
        ? "campaign"
        : "";

  const content =
    scheduleStatus === ScheduleStatus.VALIDATED
      ? "v"
      : scheduleStatus === ScheduleStatus.CAMPAIGN
        ? "c"
        : "";

  return (
    <div
      className={`schedule-status-logo-container ${containerClass}`}
      data-testid={`schedule-status-${scheduleStatus}`}
    >
      <div className="schedule-status-logo">{content}</div>
    </div>
  );
};

export default function DateHeaderCell({
  periodDate,
  teamWithMembership,
  lng,
}: {
  periodDate: periodDateT;
  teamWithMembership: TeamWithMembership;
  lng: string;
}) {
  const today = dayjs.utc().startOf("day");
  const isToday = periodDate.date.isSame(today, "day");

  return (
    <TableCell
      sx={{
        padding: 0,
      }}
      data-testid={`date-header-cell-${periodDate.date.format("YYYY-MM-DD")}`}
    >
      <div className="date-header-container">
        <span className={`weekday ${isToday && "today"}`}>
          {periodDate.date.locale(lng).format("ddd").slice(0, 3)}
        </span>
        <div className={`month-day-container ${isToday && "today"}`}>
          <span
            className={`month-day ${isToday && "today"}`}
            data-testid={`date-header-day-${periodDate.date.format(
              "YYYY-MM-DD",
            )}`}
          >
            {periodDate.date.format("DD")}
          </span>
        </div>
        <RoleBased
          role={teamWithMembership.membership.role}
          allowedRoles={[TeamMembershipRole.OWNER]}
        >
          {periodDate.scheduleStatus !== null && (
            <ScheduleStatusLogo scheduleStatus={periodDate.scheduleStatus} />
          )}
        </RoleBased>
      </div>
    </TableCell>
  );
}
