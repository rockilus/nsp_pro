import React, { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import StatsTable from "./StatsTable";
import StatsConfig from "./StatsConfig";
import { useStatStore } from "../../stores/statStore";
import { useStatsOptionsStore } from "../../stores/statsOptionsStore";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function StatsTab({ workers, shifts }: Props) {
  const statsOptions = useStatsOptionsStore((state) => state.statsOptions);
  const fetchStatsOptions = useStatsOptionsStore(
    (state) => state.fetchStatsOptions
  );
  const stats = useStatStore((state) => state.stats);

  useEffect(() => {
    fetchStatsOptions();
  }, [fetchStatsOptions]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Typography variant="h4" align="left">
        Stats
      </Typography>
      <StatsConfig statsOptions={statsOptions} />
      {stats.length > 0 && (
        <StatsTable stats={stats} workers={workers} shifts={shifts} />
      )}
    </Box>
  );
}
