import * as React from "react";
// MUI
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Grid from "@mui/material/Grid";
// Components
import RequestListItem from "./RequestListItem";
// Types
import { RequestT } from "./types";
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";

interface Props {
  team: TeamT;
  requests: RequestT[];
  workers: WorkerT[];
  shifts: ShiftT[];
}

export default function RequestList({
  team,
  requests,
  workers,
  shifts,
}: Props) {
  return (
    <Box sx={{ flexGrow: 1, maxWidth: 752 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <List dense={true}>
            {requests.map((far) => (
              <RequestListItem
                key={far.id}
                team={team}
                request={far}
                workers={workers}
                shifts={shifts}
              />
            ))}
          </List>
        </Grid>
      </Grid>
    </Box>
  );
}
