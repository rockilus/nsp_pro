import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Types
import { WorkerT } from "../../../types/worker";

export default function WorkerFieldCellDutiesPerMonth({
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
    worker.dutiesPerMonth,
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleEditConfirm = async () => {
    if (valueState !== worker.dutiesPerMonth && valueState !== "") {
      setIsSaving(true);
      try {
        await handleUpdateWorker({
          ...worker,
          dutiesPerMonth: valueState,
        });
      } finally {
        setIsSaving(false);
      }
    } else if (valueState === "") {
      setValueState(worker.dutiesPerMonth);
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.dutiesPerMonth);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() =>
        !editing && !isSaving && setEditing({ [worker.id]: "dutiesPerMonth" })
      }
      sx={{ paddingY: 0, textAlign: "center" }}
      data-testid="worker-duties-per-month-cell"
      data-saving={isSaving}
    >
      {editing ? (
        <TextField
          fullWidth
          type="number"
          name="Duties per month"
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
          disabled={isSaving}
          inputProps={{
            style: { textAlign: "center" },
            "data-testid": `worker-duties-per-month-input-${worker.id}`,
            "data-saving": isSaving,
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
          data-testid={`worker-duties-per-month-display-${worker.id}`}
          data-saving={isSaving}
          data-value={worker.dutiesPerMonth}
        >
          {isSaving ? "Saving..." : worker.dutiesPerMonth}
        </Box>
      )}
    </TableCell>
  );
}
