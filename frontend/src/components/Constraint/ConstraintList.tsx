import * as React from "react";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Grid from "@mui/material/Grid";

import ConstraintListItem from "./ConstraintListItem";
import { ConstraintT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  constraints: ConstraintT[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ConstraintList({
  constraints,
  workers,
  shifts,
}: Props) {
  return (
    <Box sx={{ flexGrow: 1, maxWidth: 752 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <List dense={true}>
            {constraints.map((constraint) => (
              <ConstraintListItem
                key={constraint.id}
                constraint={constraint}
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
