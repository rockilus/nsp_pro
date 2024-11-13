import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
// Components
import DailyShiftDemandCell from "./daily-shift-demand-cell";
import { countShifts, countStaffings } from "./assignment-count-methods";
// Styles
import "./daily-shift-demand-row.css";
// Types
import { ShiftT } from "../../../../types/shift";
import {
  AssignmentT,
  ScheduleT,
  DailyShiftDemandT,
  ScheduleStatus,
} from "../../../../types/schedule";

export default function DailyShiftDemandRow({
  lng,
  selectedDisplay,
  teamId,
  shifts,
  assignments,
  dailyShiftDemands,
  scheduleCampaign,
  periodDates,
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
  scheduleCampaign: ScheduleT | null;
  periodDates: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null }[];
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleDeleteDSD: (dsdId: string, teamId: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [counts, setCounts] = useState<{
    [date: string]: {
      [id: string]: {
        actual: number;
        target: number;
        staffingTotal: number;
      };
      total: {
        actual: number;
        target: number;
        staffingTotal: number;
      };
    };
  }>({});

  useEffect(() => {
    console.log("DailyShiftDemandRow useEffect called");
    const newCounts =
      selectedDisplay === "shift"
        ? countShifts(shifts, assignments, dailyShiftDemands, periodDates)
        : countStaffings(shifts, assignments, dailyShiftDemands, periodDates);
    console.log("newCounts", newCounts);

    setCounts(newCounts);
  }, [shifts, assignments, dailyShiftDemands, periodDates, selectedDisplay]);

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
      {periodDates.map((pDate, dateIndex) => {
        const dateStr = pDate.date.format("YYYY-MM-DD");
        const dsdDate: DailyShiftDemandT[] = dailyShiftDemands.filter((dsd) =>
          dsd.date.isSame(pDate.date, "day")
        );
        return (
          <DailyShiftDemandCell
            key={dateIndex}
            lng={lng}
            selectedDisplay={selectedDisplay}
            teamId={teamId}
            scheduleCampaign={scheduleCampaign}
            periodDate={pDate}
            dailyShiftDemands={dsdDate}
            shifts={shifts}
            counts={
              counts[dateStr] || {
                total: { actual: 0, target: 0, staffingTotal: 0 },
              }
            }
            handleCreateDSD={handleCreateDSD}
            handleUpdateDSD={handleUpdateDSD}
            handleDeleteDSD={handleDeleteDSD}
          />
        );
      })}
    </TableRow>
  );
}
