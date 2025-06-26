import { Dispatch, SetStateAction, useEffect, useState } from "react";
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
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
}) {
  const [valueState, setValueState] = useState<string>(worker.acronym);

  const handleEditConfirm = async () => {
    if (valueState !== worker.acronym) {
      console.log("In acronym: ", worker.acronym, " -> ", valueState);

      handleUpdateWorker({
        ...worker,
        acronym: valueState,
      });
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(worker.acronym);
  };

  useEffect(() => {
    setValueState(worker.acronym);
  }, [worker.acronym]);

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() => setEditing({ [worker.id]: "acronym" })}
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
          {worker.acronym}
        </Box>
      )}
    </TableCell>
  );
}
