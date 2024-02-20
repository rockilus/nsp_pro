import React, { Dispatch, SetStateAction, useState } from "react";

import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";

import { ShiftT } from "./types";
import { useShiftStore } from "../../stores/shiftStore";

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
      onClick={() => setEditing({ [shift.id]: "Name" })}
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
        shift.name
      )}
    </TableCell>
  );
}
