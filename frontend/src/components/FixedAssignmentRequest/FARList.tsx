import * as React from "react";
// MUI
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Grid from "@mui/material/Grid";
// Components
import FARListItem from "./FARListItem";
// Types
import { FarT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  fars: FarT[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function FARList({ team, fars, workers, shifts }: Props) {
  return (
    <Box sx={{ flexGrow: 1, maxWidth: 752 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <List dense={true}>
            {fars.map((far) => (
              <FARListItem
                key={far.id}
                team={team}
                far={far}
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
