import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Stores
import { useShiftStore } from "../../stores/shiftStore";
// Types
import { ShiftT } from "./types";

interface Props {
  shift: ShiftT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
}

export default function ShiftFieldCellName({
  shift,
  editing,
  setEditing,
}: Props) {
  const [valueState, setValueState] = useState(shift.name);

  const updateShift = useShiftStore((state) => state.updateShift);

  const handleEditConfirm = () => {
    if (valueState !== shift.name) {
      updateShift({ ...shift, name: valueState });
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shift.name);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() => setEditing({ [shift.id]: "name" })}
      sx={{ paddingY: 0, cursor: "pointer" }}
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
          {shift.name}
        </Box>
      )}
    </TableCell>
  );
}
