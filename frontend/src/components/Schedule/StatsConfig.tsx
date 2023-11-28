import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { useStatsOptionsStore } from "../../stores/statsOptionsStore";
import { StatsOptionsT } from "./types";
import { emptyStatsOptions } from "../../utils/emptyObjects";

dayjs.extend(utc);

interface Props {
  statsOptions: StatsOptionsT | null;
}

export default function StatsConfig({ statsOptions }: Props) {
  const [statsOptionsState, setStatsOptionsState] = useState<StatsOptionsT>(
    statsOptions ? { ...statsOptions } : { ...emptyStatsOptions }
  );
  console.log("statsOptions", statsOptions);
  console.log("statsOptionsState", statsOptionsState);
  console.log("statsOptions?", statsOptions ? "true" : "false");

  const addStatsOptions = useStatsOptionsStore(
    (state) => state.addStatsOptions
  );
  const updateStatsOptions = useStatsOptionsStore(
    (state) => state.updateStatsOptions
  );

  const handleSave = () => {
    console.log("statsOptionsState in save", statsOptionsState);

    if (statsOptions) {
      updateStatsOptions(statsOptionsState);
    } else {
      addStatsOptions(statsOptionsState);
    }
  };

  useEffect(() => {
    setStatsOptionsState(
      statsOptions ? { ...statsOptions } : { ...emptyStatsOptions }
    );
  }, [statsOptions]);

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
