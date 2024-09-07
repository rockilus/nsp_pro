import * as React from "react";
import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax";
// MUI
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
// Types
import { BreachT } from "../../../types/schedule";
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";

dayjs.extend(minMax);

export default function BreachItem({
  breach,
  CBDisplayed,
  workers,
  shifts,
  addCBsDisplayed,
  removeCBsDisplayed,
}: {
  breach: BreachT;
  CBDisplayed: boolean;
  workers: WorkerT[];
  shifts: ShiftT[];
  addCBsDisplayed: (ids: string[]) => void;
  removeCBsDisplayed: (ids: string[]) => void;
}) {
  const getDates = (): string => {
    const dates = breach.variables.map((variable) => variable.date);
    if (dates.length === 0) {
      return "";
    }
    const minDate = dayjs.min(dates) as dayjs.Dayjs;
    const maxDate = dayjs.max(dates) as dayjs.Dayjs;
    if (minDate.isSame(maxDate, "date")) {
      return minDate.format("MM/DD/YYYY");
    } else {
      return `${minDate.format("MM/DD/YYYY")} - ${maxDate.format(
        "MM/DD/YYYY"
      )}`;
    }
  };

  const getWorkerNames = (): string => {
    const workerIds = Array.from(
      new Set(breach.variables.map((variable) => variable.workerId))
    );
    const workerNames = workers
      .filter((worker) => workerIds.includes(worker.id))
      .map((worker) => worker.name);
    return workerNames.join(", ");
  };

  const getShiftNames = (): string => {
    const shiftIds = Array.from(
      new Set(breach.variables.map((variable) => variable.shiftId))
    );
    const shiftNames = shifts
      .filter((shift) => shiftIds.includes(shift.id))
      .map((shift) => shift.name);
    return shiftNames.join(", ");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        borderBottom: "0.5px solid lightgrey",
        padding: "5px 0",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontWeight: 400,
          fontSize: "0.875rem",
          lineHeight: "1.4",
          letterSpacing: "0.001rem",
          margin: "0",
          padding: "0 5px 0 0",
        }}
      >
        {breach.description}
      </span>
      <FiberManualRecordIcon
        sx={{ color: breach.hardToSoft ? "red" : "orange" }}
      />
    </div>
  );
}
