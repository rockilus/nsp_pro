import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Types
import { WorkerT } from "../../../types/worker";

export default function WorkerFieldCellWeeklyHours({
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
  const [valueState, setValueState] = useState<number | "">(worker.weeklyHours);

  const handleEditConfirm = async () => {
    if (valueState !== worker.weeklyHours && valueState !== "") {
      handleUpdateWorker({
        ...worker,
        weeklyHours: valueState,
      });
    } else if (valueState === "") {
      setValueState(worker.weeklyHours);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.weeklyHours);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() => setEditing({ [worker.id]: "weeklyHours" })}
      sx={{ paddingY: 0, textAlign: "center" }}
    >
      {editing ? (
        <TextField
          fullWidth
          type="number"
          name="Weekly Hours"
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
          inputProps={{ style: { textAlign: "center" } }}
        />
      ) : (
        <Box
          sx={{
            minHeight: 45,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {worker.weeklyHours}
        </Box>
      )}
    </TableCell>
  );
}
