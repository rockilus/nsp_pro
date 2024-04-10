import React from "react";
// MUI
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
// Components
import FARButton from "./FARButton";
import FARList from "./FARList";
// Types
import { FarT } from "./types";
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";

interface Props {
  team: TeamT;
  workers: WorkerT[];
  shifts: ShiftT[];
  fars: FarT[];
}

export default function FARTab({ team, workers, shifts, fars }: Props) {
  const dateToTimeZero = (date: Date): Date => {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0)
    );
  };

  const createButton = () => {
    return (
      <Button variant="contained" color="primary" startIcon={<AddIcon />}>
        Create
      </Button>
    );
  };

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Fixed Assignments and Requests
      </Typography>
      <FARButton
        team={team}
        buttonElement={createButton()}
        far={{
          id: "",
          workerId: "",
          date: dateToTimeZero(new Date()),
          shiftId: "",
          priority: "",
          isFA: true,
          status: "pending",
        }}
        workers={workers}
        shifts={shifts}
      />
      <FARList team={team} fars={fars} workers={workers} shifts={shifts} />
    </Box>
  );
}
