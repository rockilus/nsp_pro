import React, { useState } from "react";
import dayjs from "dayjs";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import WorkIcon from "@mui/icons-material/Work";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";
import { FixedAssignmentT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  fixedAssignment: FixedAssignmentT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  handleClose: () => void;
}

export default function FixedAssignmentPanel({
  fixedAssignment,
  workers,
  shifts,
  handleClose,
}: Props) {
  const dateToTimeZero = (date: Date): Date => {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0)
    );
  };

  const [fixedAssignmentState, setFixedAssignmentState] =
    useState<FixedAssignmentT>({
      id: fixedAssignment.id,
      workerId: fixedAssignment.workerId,
      date: fixedAssignment.date,
      shiftId: fixedAssignment.shiftId,
    });

  const addFixedAssignment = useFixedAssignmentStore(
    (state) => state.addFixedAssignment
  );
  const updateFixedAssignment = useFixedAssignmentStore(
    (state) => state.updateFixedAssignment
  );
  const deleteFixedAssignment = useFixedAssignmentStore(
    (state) => state.deleteFixedAssignment
  );

  const handleSaveFixedAssignment = async () => {
    if (fixedAssignmentState.id === "") {
      await addFixedAssignment(fixedAssignmentState);
    } else {
      await updateFixedAssignment(fixedAssignmentState);
    }
    handleClose();
  };

  const handleDeleteFixedAssignment = async () => {
    if (fixedAssignmentState.id !== "") {
      await deleteFixedAssignment(fixedAssignmentState.id);
    }
    handleClose();
  };

  const selectWorker = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}>
        <FormControl fullWidth>
          <Select
            value={fixedAssignmentState.workerId}
            label="Worker"
            onChange={(e) =>
              setFixedAssignmentState({
                ...fixedAssignmentState,
                workerId: e.target.value as string,
              })
            }
          >
            {workers.map((worker) => (
              <MenuItem key={worker.id} value={worker.id}>
                {worker.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };
  const selectShift = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}>
        <FormControl fullWidth>
          <Select
            value={fixedAssignmentState.shiftId}
            label="Shift"
            onChange={(e) =>
              setFixedAssignmentState({
                ...fixedAssignmentState,
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
          marginBottom: 1,
        }}
      >
        <Typography variant="h6" align="left" sx={{ marginLeft: 2 }}>
          Fixed Assignment
        </Typography>
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
        <PeopleAltIcon sx={{ marginLeft: 2, marginRight: 1 }} />
        {selectWorker()}
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
        <DatePicker
          sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}
          value={dayjs(fixedAssignmentState.date)}
          onChange={(newValue) =>
            setFixedAssignmentState({
              ...fixedAssignmentState,
              date: dateToTimeZero(newValue?.toDate() || new Date()),
            })
          }
        />
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
          justifyContent: "flex-end",
          width: "100%",
        }}
      >
        {fixedAssignmentState.id !== "" && (
          <Button
            variant="contained"
            color="primary"
            sx={{ marginRight: 2 }}
            onClick={handleDeleteFixedAssignment}
          >
            Delete
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          sx={{ marginRight: 2 }}
          onClick={handleSaveFixedAssignment}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
}
