import { Dispatch, SetStateAction, useState } from "react";
// MUI
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Types
import { WorkerT } from "../../../types/worker";

export default function WorkerFieldCellAcronym({
  worker,
  editing,
  setEditing,
  handleUpdateWorker,
}: {
  worker: WorkerT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  // allow async updates (parent may return a Promise)
  handleUpdateWorker: (updatedWorker: WorkerT) => void | Promise<unknown>;
}) {
  const [valueState, setValueState] = useState<string>(worker.acronym);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEditConfirm = async () => {
    if (valueState !== worker.acronym) {
      // mark updating for UX; parent may perform async work
      setIsUpdating(true);
      const res = handleUpdateWorker({ ...worker, acronym: valueState });
      if (res && typeof (res as Promise<unknown>).then === "function") {
        try {
          await (res as Promise<unknown>);
        } finally {
          setIsUpdating(false);
        }
      } else {
        setIsUpdating(false);
      }
    }

    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.acronym);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      data-testid="worker-acronym-cell"
      onClick={() => {
        if (!isUpdating) {
          // initialize local edit value from prop when entering edit mode
          setValueState(worker.acronym);
          setEditing({ [worker.id]: "acronym" });
        }
      }}
      sx={{ paddingY: 0, textAlign: "center" }}
    >
      {editing ? (
        <TextField
          fullWidth
          type="text"
          name="Acronym"
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
          disabled={isUpdating}
          inputProps={{
            style: { textAlign: "center" },
            "data-testid": `worker-acronym-input-${worker.id}`,
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
          data-testid={`worker-acronym-display-${worker.id}`}
        >
          {worker.acronym}
        </Box>
      )}
    </TableCell>
  );
}
