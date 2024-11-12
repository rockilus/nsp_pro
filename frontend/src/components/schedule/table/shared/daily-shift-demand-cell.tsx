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
  AssignmentT,
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
  periodDate: periodDate,
  assignments,
  dailyShiftDemands,
  shifts,
  handleCreateDSD,
  handleUpdateDSD,
  handleDeleteDSD,
}: {
  lng: string;
  selectedDisplay: string;
  teamId: string;
  scheduleCampaign: ScheduleT | null;
  periodDate: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null };
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  shifts: ShiftT[];
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleDeleteDSD: (dsdId: string, teamId: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );
  const [shiftsWorkNotDeleted, setShiftWorkNotDeleted] = useState<ShiftT[]>([]);
  const [assignmentsWorkNotDeleted, setAssignmentsWorkNotDeleted] = useState<
    AssignmentT[]
  >([]);
  const [dsdsWorkNotDeleted, setDsdsWorkNotDeleted] = useState<
    DailyShiftDemandT[]
  >([]);

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  // Create a shiftId to Shift map for efficient lookup
  const shiftMap: { [key: string]: ShiftT } = shiftsWorkNotDeleted.reduce(
    (map, shift) => {
      map[shift.id] = shift;
      return map;
    },
    {} as { [key: string]: ShiftT }
  );

  const actualTotal = assignmentsWorkNotDeleted.length;
  const targetTotal =
    selectedDisplay === "shift"
      ? dsdsWorkNotDeleted.reduce((sum, dsd) => sum + dsd.count, 0)
      : dsdsWorkNotDeleted.reduce((total, dsd) => {
          const shift = shiftMap[dsd.shiftId];
          if (shift && shift.staffing.length > 0) {
            // Sum all staffing counts for this shift
            const shiftStaffingTotal = shift.staffing.reduce(
              (shiftTotal, staffingEntry) =>
                shiftTotal + staffingEntry.staffing,
              0
            );
            return total + shiftStaffingTotal * dsd.count;
          }
          return total;
        }, 0);

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
        className={`dsd-stats-total ${actualTotal !== targetTotal && "breach"}`}
      >
        {`${actualTotal} / ${targetTotal}`}
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
          const assignmentsShift = assignments.filter(
            (a) => a.shiftId === shift.id
          );
          const DSDsShift = dailyShiftDemands.filter(
            (dsd) => dsd.shiftId === shift.id
          );
          const shiftStaffingTotal = shift.staffing.reduce(
            (sum, staffingEntry) => sum + staffingEntry.staffing,
            0
          );

          const actualNum = assignmentsShift.length;
          const targetNum =
            selectedDisplay === "shift"
              ? DSDsShift.reduce((sum, dsd) => sum + dsd.count, 0)
              : DSDsShift.reduce(
                  (sum, dsd) => sum + dsd.count * shiftStaffingTotal,
                  0
                );

          return (
            <div key={shift.id} className="container-dsd-item">
              <div
                className={`container-dsd-item-text ${
                  actualNum !== targetNum && "breach"
                }`}
              >
                <div className="shift-name">{shift.name}</div>
                {selectedDisplay === "worker" && (
                  <span className="dsd-stats staffing-count">{`(${shiftStaffingTotal})`}</span>
                )}
                <div className="container-dsd-stats">
                  <span className="dsd-stats dsd-stats-actual">
                    {actualNum}
                  </span>
                  <span className="dsd-stats dsd-stats-slash">/</span>
                  <span className="dsd-stats dsd-stats-target">
                    {targetNum}
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
    setAssignmentsWorkNotDeleted(
      assignments.filter((a) =>
        shiftWorkNotDeleted.some((s) => s.id === a.shiftId)
      )
    );
    setDsdsWorkNotDeleted(
      dailyShiftDemands.filter((dsd) =>
        shiftWorkNotDeleted.some((s) => s.id === dsd.shiftId)
      )
    );
  }, [shifts, assignments, dailyShiftDemands]);

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
