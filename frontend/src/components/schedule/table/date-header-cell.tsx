import React from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import TableCell from "@mui/material/TableCell";
// Styles
import "./date-header-cell.css";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function DateHeaderCell({ date }: { date: dayjs.Dayjs }) {
  const today = dayjs().startOf("day");
  const isToday = date.isSame(today, "day");

  return (
    <TableCell
      sx={{
        padding: 0,
      }}
    >
      <div className="date-header-container">
        <span className={`weekday ${isToday && "today"}`}>
          {date.format("ddd")}
        </span>
        <div className={`month-day-container ${isToday && "today"}`}>
          <span className={`month-day ${isToday && "today"}`}>
            {date.format("DD")}
          </span>
        </div>
      </div>
    </TableCell>
  );
}
