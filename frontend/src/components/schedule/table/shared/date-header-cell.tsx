import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import TableCell from "@mui/material/TableCell";
// Styles
import "./date-header-cell.css";
// Types
import { ScheduleStatus, periodDateT } from "../../../../types/schedule";

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
    <div className={`schedule-status-logo-container ${containerClass}`}>
      <div className="schedule-status-logo">{content}</div>
    </div>
  );
};

export default function DateHeaderCell({
  periodDate,
}: {
  periodDate: periodDateT;
}) {
  const today = dayjs.utc().startOf("day");
  const isToday = periodDate.date.isSame(today, "day");

  return (
    <TableCell
      sx={{
        padding: 0,
      }}
    >
      <div className="date-header-container">
        <span className={`weekday ${isToday && "today"}`}>
          {periodDate.date.format("ddd")}
        </span>
        <div className={`month-day-container ${isToday && "today"}`}>
          <span
            className={`month-day ${isToday && "today"}`}
            data-testid={`date-header-day-${periodDate.date.format(
              "YYYY-MM-DD"
            )}`}
          >
            {periodDate.date.format("DD")}
          </span>
        </div>
        {periodDate.scheduleStatus !== null && (
          <ScheduleStatusLogo scheduleStatus={periodDate.scheduleStatus} />
        )}
      </div>
    </TableCell>
  );
}
