import React, { useState } from "react";
import dayjs from "dayjs";
// MUI
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import Select from "@mui/material/Select";
import WorkIcon from "@mui/icons-material/Work";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Stores
import { useRequestStore } from "../../stores/requestStore";
// Types
import { RequestT } from "./types";
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";

interface Props {
  team: TeamT;
  request: RequestT;
  workers: WorkerT[];
  shifts: ShiftT[];
  handleClose: () => void;
}

export default function RequestPanel({
  team,
  request,
  workers,
  shifts,
  handleClose,
}: Props) {
  const [requestState, setRequestState] = useState<RequestT>({
    id: request.id,
    workerId: request.workerId,
    date: request.date,
    shiftId: request.shiftId,
    hard: request.hard,
    status: request.status,
  });

  const addRequest = useRequestStore((state) => state.addRequest);
  const updateRequest = useRequestStore((state) => state.updateRequest);

  const handleSaveRequest = async () => {
    if (requestState.id === "") {
      await addRequest(requestState, team.id);
    } else {
      updateRequest(requestState, team.id);
    }
    handleClose();
  };

  const selectWorker = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}>
        <FormControl fullWidth>
          <Select
            value={requestState.workerId}
            label="Worker"
            onChange={(e) =>
              setRequestState({
                ...requestState,
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
            value={requestState.shiftId}
            label="Shift"
            onChange={(e) =>
              setRequestState({
                ...requestState,
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
          value={dayjs(requestState.date)}
          onChange={(newValue) =>
            setRequestState({
              ...requestState,
              date: newValue?.startOf("day") || dayjs.utc().startOf("day"),
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
        <Button
          variant="contained"
          color="primary"
          sx={{ marginRight: 2 }}
          onClick={handleSaveRequest}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
}
