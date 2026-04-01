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
    worker.weeklyHoursDesired,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleEdit = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const newValue = e.target.value === "" ? "" : Number(e.target.value);
    if (newValue !== "" && newValue < worker.weeklyHours) {
      setError(`Desired hours can't be lower than ${worker.weeklyHours}`);
    } else {
      setError(null);
    }
    setValueState(newValue);
  };

  const handleEditConfirm = async (usedOnBlur: boolean = false) => {
    if (typeof valueState === "number" && valueState < worker.weeklyHours) {
      setError(`Desired hours can't be lower than ${worker.weeklyHours}`);
      if (usedOnBlur) {
        setValueState(worker.weeklyHoursDesired);
        setEditing({});
        setError(null);
      }
      return;
    }
    setError(null);
    if (valueState !== worker.weeklyHoursDesired && valueState !== "") {
      setIsSaving(true);
      try {
        await handleUpdateWorker({
          ...worker,
          weeklyHoursDesired: valueState,
        });
      } finally {
        setIsSaving(false);
      }
    } else if (valueState === "") {
      setValueState(worker.weeklyHoursDesired);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.weeklyHoursDesired);
    setError(null);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() => setEditing({ [worker.id]: "weeklyHoursDesired" })}
      sx={{ paddingY: 0, textAlign: "center" }}
      data-testid="worker-weekly-hours-desired-cell"
      data-state={editing ? "editing" : isSaving ? "saving" : "display"}
      data-current-value={worker.weeklyHoursDesired}
    >
      {editing ? (
        <TextField
          fullWidth
          type="number"
          name="Weekly hours desired"
          value={valueState}
          onChange={handleEdit}
          onBlur={() => handleEditConfirm(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleEditConfirm();
            } else if (e.key === "Escape") {
              handleEditCancel();
            }
          }}
          autoFocus
          error={!!error}
          inputProps={{
            style: { textAlign: "center" },
            "data-testid": `worker-weekly-hours-desired-input-${worker.id}`,
            "data-state": "editing",
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
          data-testid={`worker-weekly-hours-desired-display-${worker.id}`}
          data-state="display"
          data-value={worker.weeklyHoursDesired}
        >
          {worker.weeklyHoursDesired}
        </Box>
      )}
    </TableCell>
  );
}
