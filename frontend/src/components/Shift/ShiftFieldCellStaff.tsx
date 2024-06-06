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

export default function ShiftFieldCellStaff({
  shift,
  editing,
  setEditing,
}: Props) {
  const [valueState, setValueState] = useState<number>(shift.staffing);

  const updateShift = useShiftStore((state) => state.updateShift);

  const handleEditConfirm = () => {
    if (valueState !== shift.staffing) {
      updateShift({ ...shift, staffing: valueState });
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shift.staffing);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() => setEditing({ [shift.id]: "staffing" })}
      sx={{ paddingY: 0, cursor: "pointer" }}
    >
      {editing ? (
        <TextField
          fullWidth
          type="number"
          name="Staffing"
          value={valueState}
          onChange={(e) => setValueState(Number(e.target.value))}
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
        shift.staffing
      )}
    </TableCell>
  );
}
