import React, { useEffect, useState } from "react";
import { useTranslation } from "../../../../app/i18n/client";
import dayjs from "dayjs";
// MUI
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
// Components
import SimpleDemandsHeaderCell from "./simple-demands-header-cell";
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
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { AssignmentT } from "@/types/assignment";

export default function DailyShiftDemandRow({
  lng,
  teamId,
  shifts,
  assignments,
  shiftDemands,
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
  shiftDemands: ShiftDemandDTO[];
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  scheduleViewSettings: ScheduleViewSettingsT;
  handleCreateDSD: (
    shiftId: string,
    date: dayjs.Dayjs,
    count: number,
    notes?: string
  ) => Promise<void>;
  handleUpdateDSD: (
    demandId: string,
    updates: Partial<{ count: number; notes: string | null }>
  ) => Promise<void>;
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
        ? countShifts(shifts, assignments, shiftDemands, periodDates)
        : countStaffings(shifts, assignments, shiftDemands, periodDates);
    setCounts(newCounts);
  }, [shifts, assignments, shiftDemands, periodDates, scheduleViewSettings]);

  // Temporary simplified handlers for DemandsHeaderCell compatibility
  const handleCreateDSDLegacy = async () => {
    // Simplified implementation - will be fully updated when DemandsHeaderCell is migrated
  };

  const handleUpdateDSDLegacy = async () => {
    // Simplified implementation - will be fully updated when DemandsHeaderCell is migrated
  };

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
        const demandsForDate: ShiftDemandDTO[] = shiftDemands.filter((demand) =>
          dayjs.unix(demand.date).isSame(pDate.date, "day")
        );
        return (
          <SimpleDemandsHeaderCell
            key={dateIndex}
            lng={lng}
            teamId={teamId}
            scheduleCampaign={scheduleCampaign}
            periodDate={pDate}
            shiftDemands={demandsForDate}
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
