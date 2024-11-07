import React from "react";
import dayjs from "dayjs";
// MUI
import TableRow from "@mui/material/TableRow";
// Components
import DateHeaderCell from "./date-header-cell";
import ExportCell from "./export-cell";
// Types
import { ExportOptionsT, ScheduleT } from "../../../../types/schedule";

export default function DatesHeaderRow({
  lng,
  dates,
  schedule,
  handleExportSchedule,
}: {
  lng: string;
  dates: dayjs.Dayjs[];
  schedule: ScheduleT;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
}) {
  return (
    <TableRow
      style={{
        backgroundColor: "white",
        boxShadow: "1px 1px 0px 0px rgba(224, 224, 224, 1)",
      }}
    >
      <ExportCell
        lng={lng}
        dates={dates}
        schedule={schedule}
        handleExportSchedule={handleExportSchedule}
      />
      {dates.map((date, dateIndex) => (
        <DateHeaderCell key={dateIndex} date={date} />
      ))}
    </TableRow>
  );
}
