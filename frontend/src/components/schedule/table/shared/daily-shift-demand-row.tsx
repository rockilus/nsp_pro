import React from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
// Components
import DailyShiftDemandCell from "./daily-shift-demand-cell";
// Styles
import "./daily-shift-demand-row.css";
// Types
import { ShiftT } from "../../../../types/shift";
import {
  AssignmentT,
  ScheduleT,
  DailyShiftDemandT,
} from "../../../../types/schedule";

export default function DailyShiftDemandRow({
  lng,
  selectedDisplay,
  teamId,
  shifts,
  assignments,
  dailyShiftDemands,
  schedule,
  dates,
  handleCreateDSD,
  handleUpdateDSD,
  handleDeleteDSD,
}: {
  lng: string;
  selectedDisplay: string;
  teamId: string;
  shifts: ShiftT[];
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  schedule: ScheduleT;
  dates: dayjs.Dayjs[];
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleDeleteDSD: (dsdId: string, teamId: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  return (
    <TableRow
      style={{
        backgroundColor: "white",
        boxShadow: "1px 1px 0px 0px rgba(224, 224, 224, 1)",
      }}
    >
      <TableCell
        sx={{
          position: "sticky",
          left: 0,
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid #e0e0e07d",
          padding: 0,
          width: "100px",
        }}
      >
        <div className="dsd-row-label-container">
          <span className="dsd-row-label">
            {selectedDisplay === "shift" ? t("shift_count") : t("worker_count")}
          </span>
        </div>
      </TableCell>
      {dates.map((date, dateIndex) => {
        const dsdDate: DailyShiftDemandT[] = dailyShiftDemands.filter((dsd) =>
          dsd.date.isSame(date, "day")
        );
        const aDate: AssignmentT[] = assignments.filter((a) =>
          a.date.isSame(date, "day")
        );
        return (
          <DailyShiftDemandCell
            key={dateIndex}
            lng={lng}
            selectedDisplay={selectedDisplay}
            teamId={teamId}
            schedule={schedule}
            dateCell={date}
            assignments={aDate}
            dailyShiftDemands={dsdDate}
            shifts={shifts}
            handleCreateDSD={handleCreateDSD}
            handleUpdateDSD={handleUpdateDSD}
            handleDeleteDSD={handleDeleteDSD}
          />
        );
      })}
    </TableRow>
  );
}
