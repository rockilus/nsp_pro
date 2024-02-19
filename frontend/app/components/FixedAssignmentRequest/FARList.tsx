import * as React from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Grid from "@mui/material/Grid";

import FARListItem from "./FARListItem";
import { FarT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  fars: FarT[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function FARList({ fars, workers, shifts }: Props) {
  return (
    <Box sx={{ flexGrow: 1, maxWidth: 752 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <List dense={true}>
            {fars.map((far) => (
              <FARListItem
                key={far.id}
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
