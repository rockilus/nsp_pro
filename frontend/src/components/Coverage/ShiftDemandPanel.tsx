import React, { useState } from "react";
import dayjs from "dayjs";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import WorkIcon from "@mui/icons-material/Work";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { CoverageT } from "./types";
import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";
import { useRequestStore } from "../../stores/requestStore";
import { FixedAssignmentT, RequestT, FarT } from "./types";
import { ShiftIdNameT } from "../Schedule/types";

interface Props {
  coverage: CoverageT;
  shifts: ShiftIdNameT[];
  handleClose: () => void;
}

export default function ShiftDemandPanel({
  coverage,
  shifts,
  handleClose,
}: Props) {
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
    status: far.status,
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          width: "100%",
        }}
      >
        {coverage.id !== "" && (
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
