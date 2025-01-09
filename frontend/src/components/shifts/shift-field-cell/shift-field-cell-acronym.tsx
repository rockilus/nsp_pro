import React, { Dispatch, SetStateAction, useState, useEffect } from "react";
// MUI
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from "../../../types/shift";

export default function ShiftFieldCellAcronym({
  lng,
  shift,
  editing,
  setEditing,
  handleUpdateShift,
}: {
  lng: string;
  shift: ShiftT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const [valueState, setValueState] = useState(shift.acronym);

  const handleEditConfirm = () => {
    if (valueState !== shift.acronym) {
      handleUpdateShift({ ...shift, acronym: valueState });
    }
    setEditing({});
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shift.acronym);
  };

  useEffect(() => {
    setValueState(shift.acronym);
  }, [shift.acronym]);

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() =>
        shift.leaveType === ShiftLeaveType.NONE &&
        shift.restType !== ShiftRestType.OFF &&
        setEditing({ [shift.id]: "acronym" })
      }
      sx={{
        paddingY: 0,
        cursor:
          shift.leaveType === ShiftLeaveType.NONE &&
          shift.restType !== ShiftRestType.OFF
            ? "pointer"
            : "default",
      }}
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
        />
      ) : (
        <Box sx={{ minHeight: 45, display: "flex", alignItems: "center" }}>
          {shift.acronym}
        </Box>
      )}
    </TableCell>
  );
}
