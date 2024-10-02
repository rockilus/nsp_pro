import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Types
import { ShiftT } from "../../../types/shift";

export default function ShiftFieldCellStaff({
  shift,
  editing,
  setEditing,
  handleUpdateShift,
}: {
  shift: ShiftT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const [valueState, setValueState] = useState<number | "">(shift.staffing);

  const handleEditConfirm = () => {
    if (valueState !== shift.staffing && valueState !== "") {
      handleUpdateShift({ ...shift, staffing: valueState });
    } else if (valueState === "") {
      setValueState(shift.staffing);
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
        shift.staffing
      )}
    </TableCell>
  );
}
