import React, { Dispatch, SetStateAction, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TableCell from "@mui/material/TableCell";

import { ShiftT } from "./types";
import { useShiftStore } from "../../stores/shiftStore";

dayjs.extend(utc);

interface Props {
  shift: ShiftT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
}

export default function ShiftFieldCellEndTime({
  shift,
  editing,
  setEditing,
}: Props) {
  const timeSlots: dayjs.Dayjs[] = [];
  let firstSlot = shift.startTime;
  const lastSlot = dayjs.utc(firstSlot).add(24, "hour");
  while (firstSlot.isBefore(lastSlot) || firstSlot.isSame(lastSlot)) {
    timeSlots.push(firstSlot);
    firstSlot = firstSlot.add(15, "minute");
  }

  const [valueState, setValueState] = useState(shift.endTime);

  const updateShift = useShiftStore((state) => state.updateShift);

  const handleEditConfirm = () => {
    if (valueState !== shift.endTime) {
      updateShift({ ...shift, endTime: valueState });
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
      onClick={() => setEditing({ [shift.id]: "End time" })}
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
