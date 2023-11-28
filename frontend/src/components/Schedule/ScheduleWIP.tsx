import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import EditIcon from "@mui/icons-material/Edit";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

import SchedulePanelDialog from "./SchedulePanelDialog";
import { ScheduleT } from "./types";
import { solveStatusList, solveStatusColors } from "../../utils/constants";
import { useScheduleStore } from "../../stores/scheduleStore";

dayjs.extend(utc);

interface Props {
  schedule: ScheduleT;
}

export default function ScheduleWIP({ schedule }: Props) {
  const solveSchedule = useScheduleStore((state) => state.solveSchedule);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "grey.100",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="subtitle1" align="left">
          Schedule
        </Typography>
        <SchedulePanelDialog
          buttonElement={
            <IconButton>
              <EditIcon color="disabled" />
            </IconButton>
          }
          schedule={schedule}
        />
      </Box>
      <Typography variant="body2" align="left">
        {"Start: "} {schedule.startDate.format("D MMM YYYY")}
      </Typography>
      <Typography variant="body2" align="left">
        {"End: "} {schedule.endDate.format("D MMM YYYY")}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <Typography variant="body2" align="left">
          Status:
        </Typography>
        <Chip
          label={schedule.solveStatus}
          color={
            (solveStatusColors[
              solveStatusList.indexOf(schedule.solveStatus)
            ] as "default" | "success" | "error" | "warning") || "default"
          }
          sx={{ marginLeft: 1 }}
        />
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={() => solveSchedule(schedule.id)}
      >
        Solve
      </Button>
    </Box>
  );
}
