import React, { Dispatch, SetStateAction } from "react";

import TableCell from "@mui/material/TableCell";

import WorkerFieldCellName from "./WorkerFieldCellName";
import { WorkerT } from "./types";

interface Props {
  worker: WorkerT;
  workerField: string;
  editing: { [key: string]: string };
  setEditing: Dispatch<SetStateAction<{}>>;
}

export default function WorkerFieldCell({
  worker,
  workerField,
  editing,
  setEditing,
}: Props) {
  return workerField === "Name" ? (
    <WorkerFieldCellName
      worker={worker}
      editing={editing[worker.id] === "Name"}
      setEditing={setEditing}
    />
  ) : (
    <TableCell></TableCell>
  );
}
