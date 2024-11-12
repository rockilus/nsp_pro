import React from "react";
import dayjs from "dayjs";
// MUI
import TableRow from "@mui/material/TableRow";
// Components
import DateHeaderCell from "./date-header-cell";
import ExportCell from "./export-cell";
// Types
import {
  ExportOptionsT,
  ScheduleT,
  ScheduleStatus,
} from "../../../../types/schedule";

export default function DatesHeaderRow({
  lng,
  periodDates,
  scheduleCampaign,
  handleExportSchedule,
}: {
  lng: string;
  periodDates: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null }[];
  scheduleCampaign: ScheduleT | null;
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
        periodDates={periodDates}
        scheduleCampaign={scheduleCampaign}
        handleExportSchedule={handleExportSchedule}
      />
      {periodDates.map((pDate, dateIndex) => (
        <DateHeaderCell key={dateIndex} periodDate={pDate} />
      ))}
    </TableRow>
  );
}
