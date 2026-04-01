import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
// Components
import {
  useLeaveNameDisplayed,
  useRestNameDisplayed,
} from "../shift-utils/shift-utils";
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from "../../../types/shift";

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
  const getRestNameDisplayed = useRestNameDisplayed({
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
        shift.restType !== ShiftRestType.OFF &&
        setEditing({ [shift.id]: "name" })
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
      <div className="shift-name-cell">
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
            size="small"
            variant="standard"
          />
        ) : (
          <div className="shift-name-text">
            <Tooltip
              title={
                shift.restType === ShiftRestType.OFF
                  ? getRestNameDisplayed(shift.restType)
                  : shift.leaveType !== ShiftLeaveType.NONE
                    ? getLeaveNameDisplayed(shift.leaveType)
                    : shift.name || "Unnamed Shift"
              }
              placement="top"
            >
              <span>
                {shift.restType === ShiftRestType.OFF
                  ? getRestNameDisplayed(shift.restType)
                  : shift.leaveType !== ShiftLeaveType.NONE
                    ? getLeaveNameDisplayed(shift.leaveType)
                    : shift.name || "Unnamed Shift"}
              </span>
            </Tooltip>
          </div>
        )}
      </div>
    </TableCell>
  );
}
