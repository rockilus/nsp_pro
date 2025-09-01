import React, { Dispatch, SetStateAction, useState, useEffect } from "react";
// MUI
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Types
import { WorkerT } from "../../../types/worker";

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
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset the local state when the worker prop changes (after successful update)
  useEffect(() => {
    setValueState(worker.annualLeave);
    setIsUpdating(false);
  }, [worker.annualLeave]);

  const handleEditConfirm = async () => {
    if (valueState !== worker.annualLeave && valueState !== "") {
      setIsUpdating(true);
      handleUpdateWorker({
        ...worker,
        annualLeave: valueState,
      });
      // Don't reset isUpdating here - let useEffect handle it when worker updates
    } else if (valueState === "") {
      setValueState(worker.annualLeave);
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
      onClick={() =>
        !editing && !isUpdating && setEditing({ [worker.id]: "annualLeave" })
      }
      sx={{
        paddingY: 0,
        textAlign: "center",
        cursor: editing || isUpdating ? "default" : "pointer",
      }}
      data-testid="worker-annual-leave-cell"
      data-updating={isUpdating}
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
          disabled={isUpdating}
          inputProps={{
            style: { textAlign: "center" },
            "data-testid": `worker-annual-leave-input-${worker.id}`,
            "data-updating": isUpdating,
          }}
        />
      ) : (
        <Box
          sx={{
            minHeight: 45,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          data-testid={`worker-annual-leave-display-${worker.id}`}
          data-updating={isUpdating}
          data-value={worker.annualLeave}
        >
          {worker.annualLeave}
        </Box>
      )}
    </TableCell>
  );
}
