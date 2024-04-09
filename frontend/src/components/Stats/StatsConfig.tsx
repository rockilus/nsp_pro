import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Stores
import { useStatsOptionsStore } from "../../stores/statsOptionsStore";
// Types
import { StatsOptionsT } from "../Schedule/types";
import { TeamT } from "../../containers/types";
// Constants
import { emptyStatsOptions } from "../../utils/emptyObjects";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  statsOptions: StatsOptionsT | null;
}

export default function StatsConfig({ team, statsOptions }: Props) {
  const [statsOptionsState, setStatsOptionsState] = useState<StatsOptionsT>(
    statsOptions
      ? { ...statsOptions }
      : { ...emptyStatsOptions, teamId: team.id }
  );

  const addStatsOptions = useStatsOptionsStore(
    (state) => state.addStatsOptions
  );
  const updateStatsOptions = useStatsOptionsStore(
    (state) => state.updateStatsOptions
  );

  const handleSave = () => {
    if (statsOptions) {
      updateStatsOptions(statsOptionsState);
    } else {
      addStatsOptions(statsOptionsState);
    }
  };

  useEffect(() => {
    setStatsOptionsState(
      statsOptions
        ? { ...statsOptions }
        : { ...emptyStatsOptions, teamId: team.id }
    );
  }, [statsOptions, team.id]);

  return (
    <Box sx={{ display: "flex", flexDirection: "row" }}>
      <DatePicker
        label="Start date"
        value={statsOptionsState.startDate}
        onChange={(newValue) =>
          setStatsOptionsState({
            ...statsOptionsState,
            startDate: newValue
              ? dayjs.utc(newValue).startOf("day")
              : dayjs.utc().startOf("day"),
          })
        }
      />
      <DatePicker
        label="End date"
        value={statsOptionsState.endDate}
        onChange={(newValue) =>
          setStatsOptionsState({
            ...statsOptionsState,
            endDate: newValue
              ? dayjs.utc(newValue).startOf("day")
              : dayjs.utc().startOf("day"),
          })
        }
      />
      <Button variant="contained" onClick={handleSave}>
        Save
      </Button>
    </Box>
  );
}
