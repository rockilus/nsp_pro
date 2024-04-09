import React from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import StatsTable from "./StatsTable";
import StatsConfig from "./StatsConfig";
// Stores
import { useStatStore } from "../../stores/statStore";
// Types
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";
import { StatsOptionsT } from "../Schedule/types";

interface Props {
  team: TeamT;
  workers: WorkerT[];
  shifts: ShiftT[];
  statsOptions: StatsOptionsT | null;
}

export default function StatsTab({
  team,
  workers,
  shifts,
  statsOptions,
}: Props) {
  const stats = useStatStore((state) => state.stats);

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
