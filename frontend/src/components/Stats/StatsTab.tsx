import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
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
      {stats ? (
        showingCustom && stats.statsHeaders.length === 0 ? (
          <Box
            sx={{
              margin: 2,
              marginLeft: 0,
              overflowX: "auto",
              backgroundColor: "none",
              width: "100%",
            }}
          >
            <Typography
              variant="body1"
              color="textSecondary"
              sx={{ fontStyle: "italic" }}
            >
              {
                'You do not have any custom stats. Select another "Stats" in stats options and start adding custom stats.'
              }
            </Typography>
          </Box>
        ) : (
          <StatsTable
            stats={stats}
            showingCustom={showingCustom}
            workers={workers}
            shifts={shifts}
          />
        )
      ) : (
        <Box
          sx={{
            margin: 2,
            marginLeft: 0,
            overflowX: "auto",
            backgroundColor: "none",
            width: "100%",
          }}
        >
          <Typography
            variant="body1"
            color="textSecondary"
            sx={{ fontStyle: "italic" }}
          >
            {'Select your stats options and click on "get stats" button.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
