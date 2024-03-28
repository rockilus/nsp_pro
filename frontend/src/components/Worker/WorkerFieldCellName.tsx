import React, { Dispatch, SetStateAction, useState } from "react";

import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";

import { WorkerT } from "./types";
import { useWorkerStore } from "../../stores/workerStore";
import { useSnackBarStore } from "../../stores/snackbarStore";

interface Props {
  worker: WorkerT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
}

export default function WorkerFieldCellName({
  worker,
  editing,
  setEditing,
}: Props) {
  const [valueState, setValueState] = useState(worker.name);

  const updateWorker = useWorkerStore((state) => state.updateWorker);
  const updateSnackBar = useSnackBarStore((state) => state.updateSnackBar);

  const handleEditConfirm = async () => {
    if (valueState !== worker.name) {
      const responseStatus = await updateWorker({
        ...worker,
        name: valueState,
      });
      if (!responseStatus.statusOK) {
        updateSnackBar(responseStatus.message, "error");
      }
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.name);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() => setEditing({ [worker.id]: "Name" })}
    >
      {editing ? (
        <TextField
          fullWidth
          type="text"
          name="Name"
          value={valueState}
          onChange={(e) => setValueState(e.target.value)}
          onBlur={handleEditConfirm}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleEditConfirm();
            } else if (e.key === "Escape") {
              handleEditCancel();
            }
          }}
          autoFocus
        />
      ) : (
        worker.name
      )}
    </TableCell>
  );
}
