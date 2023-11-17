import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import WorkIcon from "@mui/icons-material/Work";

import { useCoverageStore } from "../../stores/coverageStore";
import { ShiftDemandT } from "./types";
import { ShiftIdNameT } from "../Schedule/types";
import { WeekDays } from "../../utils/constants";

dayjs.extend(utc);

interface Props {
  shiftDemand: ShiftDemandT;
  shifts: ShiftIdNameT[];
  handleClose: () => void;
}

export default function ShiftDemandPanel({
  shiftDemand,
  shifts,
  handleClose,
}: Props) {
  const timeSlots: dayjs.Dayjs[] = [];
  let startTime = dayjs.utc().startOf("day");
  const endTime = dayjs.utc(startTime).endOf("day");
  while (startTime.isBefore(endTime) || startTime.isSame(endTime)) {
    timeSlots.push(startTime);
    startTime = startTime.add(15, "minute");
  }

  const [SDState, setSDState] = useState<ShiftDemandT>(shiftDemand);
  const [quantityState, setQuantityState] = useState<number | "">(
    shiftDemand.quantity
  );

  const addShiftDemand = useCoverageStore((state) => state.addShiftDemand);
  const updateShiftDemand = useCoverageStore(
    (state) => state.updateShiftDemand
  );
  const deleteShiftDemand = useCoverageStore(
    (state) => state.deleteShiftDemand
  );

  const handleSaveSD = async () => {
    if (SDState.id === "") {
      await addShiftDemand(SDState);
    } else {
      await updateShiftDemand(SDState);
    }
    handleClose();
  };

  const handleDeleteSD = async () => {
    if (SDState.id !== "") {
      await deleteShiftDemand(SDState.coverageId, SDState.id);
    }
    handleClose();
  };

  const selectShift = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}>
        <FormControl fullWidth>
          <Select
            value={SDState.shiftId}
            label="Shift"
            onChange={(e) =>
              setSDState({
                ...SDState,
                shiftId: e.target.value as string,
              })
            }
          >
            {shifts.map((shift) => (
              <MenuItem key={shift.id} value={shift.id}>
                {shift.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  const selectWeekDay = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 1, width: 150 }}>
        <FormControl fullWidth>
          <Select
            value={SDState.dayIndex}
            label="Shift"
            onChange={(e) =>
              setSDState({
                ...SDState,
                dayIndex: e.target.value as number,
              })
            }
          >
            {WeekDays.map((weekDay, index) => (
              <MenuItem key={index} value={index}>
                {weekDay}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  const selectStartTime = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 0.5, width: 100 }}>
        <FormControl fullWidth>
          <Select
            value={SDState.startTime.valueOf()}
            label="Start Time"
            onChange={(e) =>
              setSDState({
                ...SDState,
                startTime: dayjs.utc(e.target.value),
              })
            }
          >
            {timeSlots.map((time) => (
              <MenuItem key={time.valueOf()} value={time.valueOf()}>
                {time.format("HH:mm")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };
  const selectEndTime = () => {
    return (
      <Box sx={{ marginLeft: 0.5, marginRight: 2, width: 100 }}>
        <FormControl fullWidth>
          <Select
            value={SDState.startTime.add(SDState.duration, "minute").valueOf()}
            label="Start Time"
            onChange={(e) =>
              setSDState({
                ...SDState,
                duration: dayjs
                  .utc(e.target.value)
                  .diff(SDState.startTime, "minute"),
              })
            }
          >
            {timeSlots.map((time) => (
              <MenuItem key={time.valueOf()} value={time.valueOf()}>
                {time.format("HH:mm")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginLeft: 2,
          marginRight: 2,
          marginBottom: 1,
        }}
      >
        <Typography>Shift Demand</Typography>
        <IconButton onClick={handleClose} sx={{ marginRight: 2 }}>
          <CloseIcon color="disabled" />
        </IconButton>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          marginBottom: 1,
        }}
      >
        <AccessTimeIcon sx={{ marginLeft: 2, marginRight: 1 }} />
        {selectWeekDay()}
        {selectStartTime()}-{selectEndTime()}
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          marginBottom: 1,
        }}
      >
        <WorkIcon sx={{ marginLeft: 2, marginRight: 1 }} />
        {selectShift()}
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          marginBottom: 1,
        }}
      >
        <PeopleAltIcon sx={{ marginLeft: 2, marginRight: 1 }} />
        <TextField
          label="Staffing"
          variant="outlined"
          type="number"
          value={quantityState}
          onChange={(e) => {
            setQuantityState(e.target.value ? parseInt(e.target.value) : "");
            setSDState({
              ...SDState,
              quantity: e.target.value ? parseInt(e.target.value) : 0,
            });
          }}
          InputLabelProps={{
            shrink: true,
          }}
          sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          width: "100%",
        }}
      >
        {shiftDemand.id !== "" && (
          <Button
            variant="contained"
            color="primary"
            sx={{ marginRight: 2 }}
            onClick={handleDeleteSD}
          >
            Delete
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          sx={{ marginRight: 2 }}
          onClick={handleSaveSD}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
}
