import React, { Dispatch, SetStateAction } from "react";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import WorkerFieldCellName from "./worker-field-cell-name";
import WorkerFieldCellWeeklyHours from "./worker-field-cell-weekly-hours";
import WorkerFieldCellAnnualLeave from "./worker-field-cell-annual-leave";
import WorkerFieldCellDutiesPerMonth from "./worker-field-cell-duties-per-month";
import WorkerFieldCellWeeklyHoursDesired from "./worker-field-cell-weekly-hours-desired";
// Types
import { WorkerT } from "../../../types/worker";

export default function WorkerFieldCell({
  worker,
  workerField,
  editing,
  setEditing,
  handleUpdateWorker,
}: {
  worker: WorkerT;
  workerField: string;
  editing: { [key: string]: string };
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
}) {
  return workerField === "name" ? (
    <WorkerFieldCellName
      worker={worker}
      editing={editing[worker.id] === "name"}
      setEditing={setEditing}
      handleUpdateWorker={handleUpdateWorker}
    />
  ) : workerField === "weeklyHours" ? (
    <WorkerFieldCellWeeklyHours
      worker={worker}
      editing={editing[worker.id] === "weeklyHours"}
      setEditing={setEditing}
      handleUpdateWorker={handleUpdateWorker}
    />
  ) : workerField === "weeklyHoursDesired" ? (
    <WorkerFieldCellWeeklyHoursDesired
      worker={worker}
      editing={editing[worker.id] === "weeklyHoursDesired"}
      setEditing={setEditing}
      handleUpdateWorker={handleUpdateWorker}
    />
  ) : workerField === "dutiesPerMonth" ? (
    <WorkerFieldCellDutiesPerMonth
      worker={worker}
      editing={editing[worker.id] === "dutiesPerMonth"}
      setEditing={setEditing}
      handleUpdateWorker={handleUpdateWorker}
    />
  ) : workerField === "annualLeave" ? (
    <WorkerFieldCellAnnualLeave
      worker={worker}
      editing={editing[worker.id] === "annualLeave"}
      setEditing={setEditing}
      handleUpdateWorker={handleUpdateWorker}
    />
  ) : (
    <TableCell></TableCell>
  );
}
