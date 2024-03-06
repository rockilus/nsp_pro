import React, { useEffect, useState } from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import StatsTable from "./StatsTable";
import StatsConfig from "./StatsConfig";
// Stores
import { useStatStore } from "../../stores/statStore";
import { useStatsOptionsStore } from "../../stores/statsOptionsStore";
// Types
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function StatsTab({ team, workers, shifts }: Props) {
  const statsOptions = useStatsOptionsStore((state) => state.statsOptions);
  const fetchStatsOptions = useStatsOptionsStore(
    (state) => state.fetchStatsOptions
  );
  const stats = useStatStore((state) => state.stats);

  useEffect(() => {
    fetchStatsOptions(team.id);
  }, [fetchStatsOptions, team.id]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Typography variant="h4" align="left">
        Stats
      </Typography>
      <StatsConfig team={team} statsOptions={statsOptions} />
      {stats.length > 0 && (
        <StatsTable stats={stats} workers={workers} shifts={shifts} />
      )}
    </Box>
  );
}
