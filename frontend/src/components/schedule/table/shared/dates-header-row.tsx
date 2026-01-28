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
  periodDateT,
} from "../../../../types/schedule";
import { TeamWithMembership } from "@/types/team";

export default function DatesHeaderRow({
  lng,
  teamWithMembership,
  periodDates,
  scheduleCampaign,
  handleExportSchedule,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  periodDates: periodDateT[];
  scheduleCampaign: ScheduleT | null;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
}) {
  return (
    <TableRow
      style={{
        backgroundColor: "white",
        boxShadow: "1px 1px 0px 0px rgba(224, 224, 224, 1)",
      }}
      data-testid="dates-header-row"
    >
      <ExportCell
        lng={lng}
        periodDates={periodDates}
        scheduleCampaign={scheduleCampaign}
        handleExportSchedule={handleExportSchedule}
      />
      {periodDates.map((pDate, dateIndex) => (
        <DateHeaderCell
          key={dateIndex}
          periodDate={pDate}
          teamWithMembership={teamWithMembership}
        />
      ))}
    </TableRow>
  );
}
