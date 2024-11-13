import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../../app/i18n/client";
// MUI
import Popover from "@mui/material/Popover";
import TableCell from "@mui/material/TableCell";
// Styles
import "./daily-shift-demand-cell.css";
import "../../../../styles/text-styles.css";
// Types
import {
  DailyShiftDemandT,
  DSDSourceType,
  ScheduleT,
  ScheduleStatus,
} from "../../../../types/schedule";
import { ShiftT, ShiftType } from "../../../../types/shift";

dayjs.extend(utc);

export default function DailyShiftDemandCell({
  lng,
  selectedDisplay,
  teamId,
  scheduleCampaign,
  periodDate,
  dailyShiftDemands,
  shifts,
  counts,
  handleCreateDSD,
  handleUpdateDSD,
  handleDeleteDSD,
}: {
  lng: string;
  selectedDisplay: string;
  teamId: string;
  scheduleCampaign: ScheduleT | null;
  periodDate: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null };
  dailyShiftDemands: DailyShiftDemandT[];
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
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleDeleteDSD: (dsdId: string, teamId: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  console.log("counts", counts);

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );
  const [shiftsWorkNotDeleted, setShiftWorkNotDeleted] = useState<ShiftT[]>([]);

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDecreaseDSD = (shift: ShiftT) => {
    if (
      !scheduleCampaign ||
      periodDate.scheduleStatus !== ScheduleStatus.CAMPAIGN
    ) {
      return;
    }
    const dsdSchedule = dailyShiftDemands.find(
      (dsd) =>
        dsd.shiftId === shift.id && dsd.sourceType === DSDSourceType.SCHEDULE
    );
    if (dsdSchedule) {
      if (dsdSchedule.count > 1) {
        handleUpdateDSD({
          ...dsdSchedule,
          count: dsdSchedule.count - 1,
        });
      } else {
        handleDeleteDSD(dsdSchedule.id, teamId);
      }
    } else {
      const dsdShiftDemand = dailyShiftDemands.find(
        (dsd) =>
          dsd.shiftId === shift.id &&
          [
            DSDSourceType.SHIFT_DEMAND,
            DSDSourceType.SHIFT_DEMAND_MODIFY,
          ].includes(dsd.sourceType) &&
          dsd.count > 0
      );
      if (dsdShiftDemand) {
        handleUpdateDSD({
          ...dsdShiftDemand,
          sourceType: DSDSourceType.SHIFT_DEMAND_MODIFY,
          count: dsdShiftDemand.count - 1,
        });
      }
    }
  };

  const handleIncreaseDSD = (shift: ShiftT) => {
    if (
      !scheduleCampaign ||
      periodDate.scheduleStatus !== ScheduleStatus.CAMPAIGN
    ) {
      return;
    }
    const dsdShiftDemand = dailyShiftDemands.find(
      (dsd) =>
        dsd.shiftId === shift.id &&
        [
          DSDSourceType.SHIFT_DEMAND,
          DSDSourceType.SHIFT_DEMAND_MODIFY,
        ].includes(dsd.sourceType) &&
        dsd.count === 0
    );
    if (dsdShiftDemand) {
      handleUpdateDSD({
        ...dsdShiftDemand,
        sourceType: DSDSourceType.SHIFT_DEMAND,
        count: dsdShiftDemand.count + 1,
      });
    } else {
      const dsdSchedule = dailyShiftDemands.find(
        (dsd) =>
          dsd.shiftId === shift.id && dsd.sourceType === DSDSourceType.SCHEDULE
      );
      if (dsdSchedule) {
        handleUpdateDSD({
          ...dsdSchedule,
          count: dsdSchedule.count + 1,
        });
      } else {
        handleCreateDSD({
          id: "",
          teamId: teamId,
          scheduleId: scheduleCampaign.id,
          shiftDemandId: null,
          sourceType: DSDSourceType.SCHEDULE,
          date: periodDate.date,
          shiftId: shift.id,
          count: 1,
        });
      }
    }
  };

  const AdjustStaffingButtons = ({ shift }: { shift: ShiftT }) => {
    return (
      <div className="adjust-dsd-buttons">
        <button
          className="adjust-button adjust-button-left"
          onClick={() => handleDecreaseDSD(shift)}
        >
          –
        </button>
        <button
          className="adjust-button adjust-button-right"
          onClick={() => handleIncreaseDSD(shift)}
        >
          +
        </button>
      </div>
    );
  };

  const DSDPopoverButton = () => {
    return (
      <span
        className={`dsd-stats-total ${
          counts.total.actual !== counts.total.target && "breach"
        }`}
      >
        {`${counts.total.actual} / ${counts.total.target}`}
      </span>
    );
  };

  const PopoverContent = () => {
    return (
      <div>
        <span className="subtitle">
          {selectedDisplay === "shift" ? t("shift_count") : t("worker_count")}
        </span>
        <div className="divider-popover" />
        {shiftsWorkNotDeleted.map((shift) => {
          return (
            <div key={shift.id} className="container-dsd-item">
              <div
                className={`container-dsd-item-text ${
                  counts[shift.id].actual !== counts[shift.id].target &&
                  "breach"
                }`}
              >
                <div className="shift-name">{shift.name}</div>
                {selectedDisplay === "worker" && (
                  <span className="dsd-stats staffing-count">{`(${
                    counts[shift.id].staffingTotal
                  })`}</span>
                )}
                <div className="container-dsd-stats">
                  <span className="dsd-stats dsd-stats-actual">
                    {counts[shift.id].actual}
                  </span>
                  <span className="dsd-stats dsd-stats-slash">/</span>
                  <span className="dsd-stats dsd-stats-target">
                    {counts[shift.id].target}
                  </span>
                </div>
              </div>
              {periodDate.scheduleStatus === ScheduleStatus.CAMPAIGN && (
                <div className="container-dsd-adjust-buttons">
                  <AdjustStaffingButtons shift={shift} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    const shiftWorkNotDeleted = shifts.filter(
      (s) =>
        [ShiftType.NORMAL, ShiftType.DUTY].includes(s.shiftType) && !s.deleted
    );
    setShiftWorkNotDeleted(shiftWorkNotDeleted);
  }, [shifts]);

  return (
    <TableCell
      sx={{
        padding: 0,
        borderRight: "1px solid #e0e0e07d",
      }}
    >
      {periodDate.scheduleStatus !== null && (
        <div className="container-dsd-cell">
          <button onClick={handleClick}>
            <DSDPopoverButton />
          </button>
          <Popover
            id={id}
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            slotProps={{
              paper: {
                style: {
                  boxShadow: "0px 3px 5px rgba(0, 0, 0, 0.2)",
                  padding: 20,
                  width: 300,
                },
              },
            }}
          >
            <PopoverContent />
          </Popover>
        </div>
      )}
    </TableCell>
  );
}
