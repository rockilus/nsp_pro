import * as React from "react";
import dayjs from "dayjs";
import minMax from "dayjs/plugin/minMax";
// MUI
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
// Types
import { ObjectiveBreachT } from "../types";
import { ShiftT } from "../../Shift/types";
import { WorkerT } from "../../Worker/types";

dayjs.extend(minMax);

interface Props {
  objectiveBreach: ObjectiveBreachT;
  CBDisplayed: boolean;
  workers: WorkerT[];
  shifts: ShiftT[];
  addCBsDisplayed: (ids: string[]) => void;
  removeCBsDisplayed: (ids: string[]) => void;
}

export default function ConstraintBreachItem({
  objectiveBreach,
  CBDisplayed,
  workers,
  shifts,
  addCBsDisplayed,
  removeCBsDisplayed,
}: Props) {
  const getDates = (): string => {
    const dates = objectiveBreach.variables.map((variable) => variable.date);
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
      new Set(objectiveBreach.variables.map((variable) => variable.workerId))
    );
    const workerNames = workers
      .filter((worker) => workerIds.includes(worker.id))
      .map((worker) => worker.name);
    return workerNames.join(", ");
  };

  const getShiftNames = (): string => {
    const shiftIds = Array.from(
      new Set(objectiveBreach.variables.map((variable) => variable.shiftId))
    );
    const shiftNames = shifts
      .filter((shift) => shiftIds.includes(shift.id))
      .map((shift) => shift.name);
    return shiftNames.join(", ");
  };

  return (
    <ListItem
      sx={{
        borderBottom: "0.5px solid lightgrey",
      }}
    >
      {/* {getDates()}
      <br />
      {getWorkerNames()}
      <br />
      {getShiftNames()}

      <Typography variant="body2">
        {objectiveBreach.objectiveCategory.charAt(0).toUpperCase() +
          objectiveBreach.objectiveCategory.slice(1)}
      </Typography> */}
      <ListItemText primary={objectiveBreach.description} />
      <FiberManualRecordIcon
        sx={{ color: objectiveBreach.hardToSoft ? "red" : "orange" }}
      />
    </ListItem>
  );
}
