import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Popover from "@mui/material/Popover";
// Styles
import "./daily-shift-demand-cell.css";
// Types
import {
  AssignmentT,
  DailyShiftDemandT,
  DSDSourceType,
  ScheduleT,
} from "../../../types/schedule";
import { ShiftT, ShiftType } from "../../../types/shift";

dayjs.extend(utc);

export default function DailyShiftDemandCell({
  teamId,
  schedule,
  dateCell,
  assignments,
  dailyShiftDemands,
  shifts,
  handleCreateDSD,
  handleUpdateDSD,
  handleDeleteDSD,
}: {
  teamId: string;
  schedule: ScheduleT;
  dateCell: dayjs.Dayjs;
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  shifts: ShiftT[];
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleDeleteDSD: (dsdId: string, teamId: string) => void;
}) {
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

  const actualTotal = assignmentsWorkNotDeleted.length;
  const targetTotal = dsdsWorkNotDeleted.reduce(
    (sum, dsd) => sum + dsd.count,
    0
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDecreaseDSD = (shift: ShiftT) => {
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
          scheduleId: schedule.id,
          shiftDemandId: null,
          sourceType: DSDSourceType.SCHEDULE,
          date: dateCell,
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
        {shiftsWorkNotDeleted.map((shift) => {
          const shiftAssignments = assignments.filter(
            (a) => a.shiftId === shift.id
          );
          const shiftDSDs = dailyShiftDemands.filter(
            (dsd) => dsd.shiftId === shift.id
          );
          const actualNum = shiftAssignments.length;
          const targetNum = shiftDSDs.reduce((sum, dsd) => sum + dsd.count, 0);

          return (
            <div key={shift.id} className="container-dsd-item">
              <div
                className={`container-dsd-item-text ${
                  actualNum !== targetNum && "breach"
                }`}
              >
                <div className="shift-name">{shift.name}</div>
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
              <div className="container-dsd-adjust-buttons">
                <AdjustStaffingButtons shift={shift} />
              </div>
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
  );
}
