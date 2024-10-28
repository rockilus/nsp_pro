import React from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
// Components
import DailyShiftDemandCell from "./daily-shift-demand-cell";
// Styles
import "./daily-shift-demand-row.css";
// Types
import { ShiftT } from "../../../types/shift";
import {
  AssignmentT,
  ScheduleT,
  DailyShiftDemandT,
} from "../../../types/schedule";

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
    <TableRow>
      <TableCell
        sx={{
          position: "sticky",
          left: 0,
          backgroundColor: "#FFFFFF",
          padding: 0,
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
          <TableCell
            key={dateIndex}
            sx={{
              padding: 0,
            }}
          >
            <DailyShiftDemandCell
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
          </TableCell>
        );
      })}
    </TableRow>
  );
}
