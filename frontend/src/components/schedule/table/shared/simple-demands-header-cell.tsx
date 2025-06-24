import React from "react";
import { useTranslation } from "../../../../app/i18n/client";
import dayjs from "dayjs";
// MUI
import TableCell from "@mui/material/TableCell";
// Types
import { ShiftT } from "../../../../types/shift";
import {
  ScheduleT,
  periodDateT,
  ScheduleViewSettingsT,
} from "../../../../types/schedule";
import { ShiftDemandDTO } from "@/types/shiftDemand";

export default function SimpleDemandsHeaderCell({
  lng,
  teamId,
  scheduleCampaign,
  periodDate,
  shiftDemands,
  shifts,
  counts,
  scheduleViewSettings,
  handleCreateDSD,
  handleUpdateDSD,
}: {
  lng: string;
  teamId: string;
  scheduleCampaign: ScheduleT | null;
  periodDate: periodDateT;
  shiftDemands: ShiftDemandDTO[];
  shifts: ShiftT[];
  counts: {
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

  return (
    <TableCell align="center">
      <div style={{ minWidth: "60px" }}>
        <div>
          {counts.total?.actual || 0} / {counts.total?.target || 0}
        </div>
        {/* Future: Add editing controls here when migrating full functionality */}
      </div>
    </TableCell>
  );
}
