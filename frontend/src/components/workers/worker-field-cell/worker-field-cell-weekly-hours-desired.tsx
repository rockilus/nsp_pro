import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Types
import { WorkerT } from "../../../types/worker";

export default function WorkerFieldCellWeeklyHoursDesired({
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
  const [valueState, setValueState] = useState<number | "">(
    worker.weeklyHoursDesired
  );

  const handleEditConfirm = async () => {
    if (valueState !== worker.weeklyHoursDesired && valueState !== "") {
      handleUpdateWorker({
        ...worker,
        weeklyHoursDesired: valueState,
      });
    } else if (valueState === "") {
      setValueState(worker.weeklyHoursDesired);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.weeklyHoursDesired);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() => setEditing({ [worker.id]: "weeklyHoursDesired" })}
      sx={{ paddingY: 0 }}
    >
      {editing ? (
        <TextField
          fullWidth
          type="number"
          name="Weekly hours desired"
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
          {worker.weeklyHoursDesired}
        </Box>
      )}
    </TableCell>
  );
}
