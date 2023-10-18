import * as React from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Grid from "@mui/material/Grid";

import FixedAssignmentListItem from "./FixedAssignmentListItem";
import { FixedAssignmentT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  fixedAssignments: FixedAssignmentT[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function FixedAssignmentsList({
  fixedAssignments,
  workers,
  shifts,
}: Props) {
  return (
    <Box sx={{ flexGrow: 1, maxWidth: 752 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <List dense={true}>
            {fixedAssignments.map((fixedAssignment) => (
              <FixedAssignmentListItem
                key={fixedAssignment.id}
                fixedAssignment={fixedAssignment}
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
