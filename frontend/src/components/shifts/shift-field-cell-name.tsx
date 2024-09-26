import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
// Components
import useLeaveNameDisplayed from "./shift-utils/shift-utils";
// Types
import { ShiftT, ShiftLeaveType } from "../../types/shift";

export default function ShiftFieldCellName({
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
  const [valueState, setValueState] = useState(shift.name);

  const getLeaveNameDisplayed = useLeaveNameDisplayed({
    lng,
  });

  const handleEditConfirm = () => {
    if (valueState !== shift.name) {
      handleUpdateShift({ ...shift, name: valueState });
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
      onClick={() =>
        shift.leaveType === ShiftLeaveType.NONE &&
        setEditing({ [shift.id]: "name" })
      }
      sx={{
        paddingY: 0,
        cursor: shift.leaveType === ShiftLeaveType.NONE ? "pointer" : "default",
      }}
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
          {shift.leaveType !== ShiftLeaveType.NONE
            ? getLeaveNameDisplayed(shift.leaveType)
            : shift.name}
        </Box>
      )}
    </TableCell>
  );
}
