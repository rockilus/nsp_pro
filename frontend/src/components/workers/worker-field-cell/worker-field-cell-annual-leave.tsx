import { Dispatch, SetStateAction, useState } from "react";
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
  // handleUpdateWorker may return a Promise when the parent performs async updates
  handleUpdateWorker: (updatedWorker: WorkerT) => void | Promise<unknown>;
}) {
  const [valueState, setValueState] = useState<number | "">(worker.annualLeave);
  const [isUpdating, setIsUpdating] = useState(false);

  // NOTE:
  // Avoid updating local state from an effect (calling setState in useEffect)
  // to satisfy the react-hooks lint rule and avoid hook dependency-size errors.
  // Instead, we initialize the local value when entering edit mode and
  // clear the updating flag after the parent update completes (if a Promise
  // is returned). This keeps the editing UX correct without side-effectful
  // effects.

  const handleEditConfirm = async () => {
    if (valueState !== worker.annualLeave && valueState !== "") {
      setIsUpdating(true);
      const result = handleUpdateWorker({
        ...worker,
        annualLeave: valueState,
      });

      // If the handler returns a Promise, wait for it to settle before
      // clearing the updating flag. Otherwise, clear immediately.
      if (result && typeof (result as Promise<unknown>).then === "function") {
        try {
          await (result as Promise<unknown>);
        } finally {
          setIsUpdating(false);
        }
      } else {
        setIsUpdating(false);
      }
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
      onClick={() => {
        if (!editing && !isUpdating) {
          // Initialize local input state when starting to edit so the input
          // always reflects the current persisted value.
          setValueState(worker.annualLeave);
          setEditing({ [worker.id]: "annualLeave" });
        }
      }}
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
