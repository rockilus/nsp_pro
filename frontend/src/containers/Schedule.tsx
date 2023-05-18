import React from "react";

import Grid from "@mui/material/Grid";

import DateRangePickerValue from "../components/Schedule/DateRangePicker";
import WeekDataGrid from "../components/Schedule/WeekDataGrid";
import ScheduleDisplay from "../components/Schedule/ScheduleDisplay";

export default function Schedule() {
  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="stretch"
      spacing={2}
    >
      <Grid item xs={12}>
        <DateRangePickerValue />
      </Grid>
      <Grid item xs={12}>
        <ScheduleDisplay />
      </Grid>
    </Grid>
  );
}
