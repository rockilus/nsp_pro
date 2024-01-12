import * as React from "react";

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Grid from "@mui/material/Grid";

import ConstraintListItem from "./ConstraintListItem";
import { ConstraintT } from "./types";

interface Props {
  constraints: ConstraintT[];
}

export default function ConstraintList({ constraints }: Props) {
  return (
    <Box sx={{ margin: 1 }}>
      <Grid container spacing={0}>
        {constraints.map((constraint) => (
          <ConstraintListItem key={constraint.id} constraint={constraint} />
        ))}
      </Grid>
    </Box>
  );
}
