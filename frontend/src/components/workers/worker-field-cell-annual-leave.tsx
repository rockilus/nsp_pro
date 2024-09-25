import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Types
import { WorkerT } from "../../types/worker";

export default function WorkerFieldCellAnnualLeave({
  worker,
  editing,
  setEditing,
  handleUpdateWorker,
}: {
  worker: WorkerT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
}) {
  const [valueState, setValueState] = useState<number | "">(worker.annualLeave);

  const handleEditConfirm = async () => {
    if (valueState !== worker.annualLeave && valueState !== "") {
      handleUpdateWorker({
        ...worker,
        annualLeave: valueState,
      });
    } else if (valueState === "") {
      setValueState(worker.weeklyHours);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.annualLeave);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() => setEditing({ [worker.id]: "annualLeave" })}
      sx={{ paddingY: 0 }}
    >
      {editing ? (
        <TextField
          fullWidth
          type="number"
          name="Annual Leave"
          value={valueState}
          onChange={(e) =>
            setValueState(e.target.value === "" ? "" : Number(e.target.value))
          }
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
          {worker.annualLeave}
        </Box>
      )}
    </TableCell>
  );
}
