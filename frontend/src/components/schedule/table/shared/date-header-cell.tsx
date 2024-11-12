import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import TableCell from "@mui/material/TableCell";
// Styles
import "./date-header-cell.css";
// Types
import { ScheduleStatus } from "../../../../types/schedule";

dayjs.extend(utc);

export default function DateHeaderCell({
  periodDate,
}: {
  periodDate: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null };
}) {
  const today = dayjs.utc().startOf("day");
  const isToday = periodDate.date.isSame(today, "day");

  const ScheduleStatusLogo = () => {
    return (
      <div
        className={`schedule-status-logo-container ${
          periodDate.scheduleStatus === ScheduleStatus.VALIDATED
            ? "validated"
            : periodDate.scheduleStatus === ScheduleStatus.CAMPAIGN
            ? "campaign"
            : ""
        }`}
      >
        <div className="schedule-status-logo">
          {periodDate.scheduleStatus === ScheduleStatus.VALIDATED
            ? "v"
            : periodDate.scheduleStatus === ScheduleStatus.CAMPAIGN
            ? "c"
            : ""}
        </div>
      </div>
    );
  };

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
          <span className={`month-day ${isToday && "today"}`}>
            {periodDate.date.format("DD")}
          </span>
        </div>
        {periodDate.scheduleStatus === ScheduleStatus.VALIDATED && (
          <ScheduleStatusLogo />
        )}
      </div>
    </TableCell>
  );
}
