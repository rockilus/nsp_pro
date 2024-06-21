import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Stores
import { useWorkerStore } from "../../stores/workerStore";
// Types
import { WorkerT } from "../../types/worker";

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

  const handleEditConfirm = async () => {
    if (valueState !== worker.name) {
      updateWorker({
        ...worker,
        name: valueState,
      });
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
      onClick={() => setEditing({ [worker.id]: "name" })}
      sx={{ paddingY: 0 }}
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
        <Box sx={{ minHeight: 45, display: "flex", alignItems: "center" }}>
          {worker.name}
        </Box>
      )}
    </TableCell>
  );
}
