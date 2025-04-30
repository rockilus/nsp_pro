import React, { useEffect, useState } from "react";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
// Components
import DemandsHeaderCell from "./demands-header-cell";
import { countShifts, countStaffings } from "./assignment-count-methods";
// Styles
import "./daily-shift-demand-row.css";
// Types
import { ShiftT } from "../../../../types/shift";
import {
  ScheduleT,
  periodDateT,
  ScheduleViewSettingsT,
} from "../../../../types/schedule";
import { DailyShiftDemandT } from "@/types/daily-shift-demand";
import { AssignmentT } from "@/types/assignment";

export default function DailyShiftDemandRow({
  lng,
  teamId,
  shifts,
  assignments,
  dailyShiftDemands,
  scheduleCampaign,
  periodDates,
  scheduleViewSettings,
  handleCreateDSD,
  handleUpdateDSD,
}: {
  lng: string;
  teamId: string;
  shifts: ShiftT[];
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  scheduleViewSettings: ScheduleViewSettingsT;
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
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
    const newCounts =
      scheduleViewSettings.groupBy === "shift"
        ? countShifts(shifts, assignments, dailyShiftDemands, periodDates)
        : countStaffings(shifts, assignments, dailyShiftDemands, periodDates);
    setCounts(newCounts);
  }, [
    shifts,
    assignments,
    dailyShiftDemands,
    periodDates,
    scheduleViewSettings,
  ]);

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
            {scheduleViewSettings.groupBy === "shift"
              ? t("shift_count")
              : t("worker_count")}
          </span>
        </div>
      </TableCell>
      {periodDates.map((pDate, dateIndex) => {
        const dateStr = pDate.date.format("YYYY-MM-DD");
        const dsdDate: DailyShiftDemandT[] = dailyShiftDemands.filter((dsd) =>
          dsd.date.isSame(pDate.date, "day")
        );
        return (
          <DemandsHeaderCell
            key={dateIndex}
            lng={lng}
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
            scheduleViewSettings={scheduleViewSettings}
            handleCreateDSD={handleCreateDSD}
            handleUpdateDSD={handleUpdateDSD}
          />
        );
      })}
    </TableRow>
  );
}
