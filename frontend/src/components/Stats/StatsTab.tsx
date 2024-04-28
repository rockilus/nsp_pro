import React from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import StatsTable from "./Table/StatsTable";
import StatsOptions from "./Options/StatsOptions";
// Stores
import { useStatStore } from "../../stores/statStore";
// Types
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";
import { StatsOptionsT, StatsShiftOptionsT } from "./types";

interface Props {
  team: TeamT;
  workers: WorkerT[];
  shifts: ShiftT[];
  statsOptions: StatsOptionsT;
  statsShiftOptions: StatsShiftOptionsT;
}

export default function StatsTab({
  team,
  workers,
  shifts,
  statsOptions,
  statsShiftOptions,
}: Props) {
  const stats = useStatStore((state) => state.stats);

  return (
    <Box sx={{ display: "flex", flexDirection: "row" }}>
      <StatsOptions
        team={team}
        statsOptions={statsOptions}
        statsShiftOptions={statsShiftOptions}
      />
      {stats && (
        <StatsTable
          statsOptions={statsOptions}
          stats={stats}
          workers={workers}
          shifts={shifts}
        />
      )}
    </Box>
  );
}
