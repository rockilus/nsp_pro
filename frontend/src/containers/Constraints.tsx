import React from "react";

import Grid from "@mui/material/Grid";

import AddConstaint from "../components/Constraints/AddConstraint";

export default function Constraints() {
  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="stretch"
      spacing={2}
    >
      <Grid item xs={12}>
        <AddConstaint />
      </Grid>
      <Grid item xs={12}>
        Constraints to come here
      </Grid>
    </Grid>
  );
}
