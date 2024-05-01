import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
// Components
import StatsTable from "./Table/StatsTable";
import StatsOptions from "./Options/StatsOptions";
// Stores
import { useStatStore } from "../../stores/statsStore";
// Types
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";
import { StatsShiftOptionsT } from "./types";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  workers: WorkerT[];
  shifts: ShiftT[];
  statsShiftOptions: StatsShiftOptionsT;
}

export default function StatsTab({
  team,
  workers,
  shifts,
  statsShiftOptions,
}: Props) {
  const [showingCustom, setShowingCustom] = useState<boolean>(true);
  const stats = useStatStore((state) => state.stats);

  return (
    <Box sx={{ display: "flex", flexDirection: "row" }}>
      <StatsOptions
        team={team}
        statsShiftOptions={statsShiftOptions}
        setShowingCustom={setShowingCustom}
      />
      {stats && (
        <StatsTable
          stats={stats}
          showingCustom={showingCustom}
          workers={workers}
          shifts={shifts}
        />
      )}
    </Box>
  );
}
