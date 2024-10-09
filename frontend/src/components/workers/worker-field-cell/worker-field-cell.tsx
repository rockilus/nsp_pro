import React, { Dispatch, SetStateAction } from "react";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import WorkerFieldCellName from "./worker-field-cell-name";
import WorkerFieldCellWeeklyHours from "./worker-field-cell-weekly-hours";
import WorkerFieldCellAnnualLeave from "./worker-field-cell-annual-leave";
import WorkerFieldCellDutiesPerMonth from "./worker-field-cell-duties-per-month";
import WorkerFieldCellWeeklyHoursDesired from "./worker-field-cell-weekly-hours-desired";
import WorkerSpecialtyCell from "./specialties/worker-specialty-cell";
// Types
import { WorkerT } from "../../../types/worker";
import { SpecialtyT } from "../../../types/team";

export default function WorkerFieldCell({
  worker,
  workerField,
  specialties,
  editing,
  setEditing,
  handleUpdateWorker,
}: {
  worker: WorkerT;
  workerField: string;
  specialties: SpecialtyT[];
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
  ) : workerField === "specialties" ? (
    <WorkerSpecialtyCell
      worker={worker}
      specialties={specialties}
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
