import React, { Dispatch, SetStateAction, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TableCell from "@mui/material/TableCell";
// Types
import { ShiftT, ShiftLeaveType, ShiftRestType } from "../../../types/shift";

dayjs.extend(utc);

export default function ShiftFieldCellEndTime({
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
  const [valueState, setValueState] = useState(shift.endTime);

  const buildTimeSlots = (): dayjs.Dayjs[] => {
    const timeSlots: dayjs.Dayjs[] = [];
    let firstSlot = shift.startTime;
    const lastSlot = dayjs.utc(firstSlot).add(24, "hour");
    while (firstSlot.isBefore(lastSlot) || firstSlot.isSame(lastSlot)) {
      timeSlots.push(firstSlot);
      firstSlot = firstSlot.add(15, "minute");
    }
    return timeSlots;
  };

  const timeSlots = buildTimeSlots();

  const handleEditConfirm = () => {
    if (valueState !== shift.endTime) {
      handleUpdateShift({ ...shift, endTime: valueState });
    }
    setEditing({});
  };

  const selectEndTime = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 0.5, width: 100 }}>
        <FormControl fullWidth>
          <Select
            value={valueState.valueOf()}
            label="End time"
            onChange={(e) => setValueState(dayjs.utc(e.target.value))}
            onBlur={handleEditConfirm}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleEditConfirm();
              } else if (e.key === "Escape") {
                handleEditCancel();
              }
            }}
          >
            {timeSlots.map((time) => (
              <MenuItem key={time.valueOf()} value={time.valueOf()}>
                {time.format("HH:mm")}
                {" ("}
                {time.diff(shift.startTime, "minute") / 60}
                {"h)"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  const handleEditCancel = () => {
    setEditing({});
    setValueState(shift.endTime);
  };

  return (
    <TableCell
      component="th"
      scope="row"
      onClick={() =>
        shift.leaveType === ShiftLeaveType.NONE &&
        shift.restType !== ShiftRestType.OFF &&
        setEditing({ [shift.id]: "end_time" })
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
        selectEndTime()
      ) : (
        <>
          {shift.endTime.format("HH:mm")}
          {!shift.endTime.isSame(shift.startTime, "day") && <sup>+1</sup>}
        </>
      )}
    </TableCell>
  );
}
