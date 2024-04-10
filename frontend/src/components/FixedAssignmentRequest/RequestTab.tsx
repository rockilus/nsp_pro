import React from "react";
// MUI
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
// Components
import RequestButton from "./RequestButton";
import RequestList from "./RequestList";
// Types
import { RequestT } from "./types";
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";

interface Props {
  team: TeamT;
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
}

export default function RequestTab({ team, workers, shifts, requests }: Props) {
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
      <RequestButton
        team={team}
        buttonElement={createButton()}
        request={{
          id: "",
          workerId: "",
          date: dateToTimeZero(new Date()),
          shiftId: "",
          hard: true,
          status: "pending",
        }}
        workers={workers}
        shifts={shifts}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignSelf: "flex-start",
          backgroundColor: "grey.100",
          minWidth: 200,
          border: "1px solid grey",
          borderRadius: 2,
          margin: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minHeight: 45,
            paddingX: 1,
            borderBottom: "1px solid lightgrey",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              alignItems: "center",
            }}
          >
            <Typography
              variant="subtitle1"
              align="left"
              sx={{ fontWeight: "bold" }}
            >
              Requests
            </Typography>
          </Box>
        </Box>
        <RequestList
          team={team}
          requests={requests}
          workers={workers}
          shifts={shifts}
        />
      </Box>
    </Box>
  );
}
