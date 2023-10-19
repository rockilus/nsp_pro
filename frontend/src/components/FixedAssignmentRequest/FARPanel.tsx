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
import ThermostatIcon from "@mui/icons-material/Thermostat";
import WorkIcon from "@mui/icons-material/Work";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";
import { useRequestStore } from "../../stores/RequestStore";
import { FixedAssignmentT, RequestT, FarT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  far: FarT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  handleClose: () => void;
}

export default function FARPanel({ far, workers, shifts, handleClose }: Props) {
  const dateToTimeZero = (date: Date): Date => {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0)
    );
  };

  const [FAPanel, setFAPanel] = useState<boolean>(far.isFA);

  const [farState, setFarState] = useState<FarT>({
    id: far.id,
    workerId: far.workerId,
    date: far.date,
    shiftId: far.shiftId,
    priority: far.priority,
    isFA: far.isFA,
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
  const addRequest = useRequestStore((state) => state.addRequest);
  const updateRequest = useRequestStore((state) => state.updateRequest);
  const deleteRequest = useRequestStore((state) => state.deleteRequest);

  const handleSaveFar = async () => {
    if (farState.id === "") {
      if (FAPanel) {
        const fixedAssignment = farState as FixedAssignmentT;
        await addFixedAssignment(fixedAssignment);
        if (!far.isFA && far.id !== "") {
          await deleteRequest(far.id);
        }
      } else {
        const request = farState as RequestT;
        await addRequest(request);
        if (!far.isFA && far.id !== "") {
          await deleteRequest(far.id);
        }
      }
    } else {
      if (FAPanel) {
        const fixedAssignment = farState as FixedAssignmentT;
        await updateFixedAssignment(fixedAssignment);
      } else {
        const request = farState as RequestT;
        await updateRequest(request);
      }
    }
    handleClose();
  };

  const handleDeleteFar = async () => {
    if (farState.id !== "") {
      if (FAPanel) {
        await deleteFixedAssignment(farState.id);
      } else {
        await deleteRequest(farState.id);
      }
    }
    handleClose();
  };

  const handleSelectFA = () => {
    setFAPanel(true);
    setFarState({
      ...farState,
      id: far.isFA ? far.id : "",
      isFA: true,
    });
  };

  const handleSelectR = () => {
    setFAPanel(false);
    setFarState({
      ...farState,
      id: far.isFA ? "" : far.id,
      isFA: false,
    });
  };

  const selectFAR = () => {
    const variantFA = FAPanel ? "contained" : "text";
    const variantR = FAPanel ? "text" : "contained";
    return (
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <Button
          variant={variantFA}
          sx={{ textTransform: "none", marginRight: 1 }}
          onClick={handleSelectFA}
        >
          Fixed Assignment
        </Button>
        <Button
          variant={variantR}
          sx={{ textTransform: "none" }}
          onClick={handleSelectR}
        >
          Request
        </Button>
      </Box>
    );
  };

  const selectWorker = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}>
        <FormControl fullWidth>
          <Select
            value={farState.workerId}
            label="Worker"
            onChange={(e) =>
              setFarState({
                ...farState,
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
            value={farState.shiftId}
            label="Shift"
            onChange={(e) =>
              setFarState({
                ...farState,
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

  const selectPriority = () => {
    const priorityOptions = ["low", "medium", "high"];
    return (
      <Box sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}>
        <FormControl fullWidth>
          <Select
            value={farState.priority}
            label="Shift"
            onChange={(e) =>
              setFarState({
                ...farState,
                priority: e.target.value as string,
              })
            }
          >
            {priorityOptions.map((option, index) => (
              <MenuItem key={index} value={option}>
                {option}
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
        {selectFAR()}
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
          value={dayjs(farState.date)}
          onChange={(newValue) =>
            setFarState({
              ...farState,
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
      {!farState.isFA && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            marginBottom: 1,
          }}
        >
          <ThermostatIcon sx={{ marginLeft: 2, marginRight: 1 }} />
          {selectPriority()}
        </Box>
      )}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          width: "100%",
        }}
      >
        {farState.id !== "" && (
          <Button
            variant="contained"
            color="primary"
            sx={{ marginRight: 2 }}
            onClick={handleDeleteFar}
          >
            Delete
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          sx={{ marginRight: 2 }}
          onClick={handleSaveFar}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
}
