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
import ScheduleValidateDialog from "./ScheduleValidateDialog";
import { ScheduleT } from "./types";
import { SolveStatusList, SolveStatusColors } from "../../utils/constants";
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
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <SchedulePanelDialog
            buttonElement={
              <Typography
                variant="body2"
                align="left"
                sx={{ cursor: "pointer" }}
              >
                {schedule.startDate.format("D MMM YYYY")}
                {" - "}
                {schedule.endDate.format("D MMM YYYY")}
              </Typography>
            }
            schedule={schedule}
          />
        </Box>
        <Chip
          label={schedule.solveStatus}
          color={
            (SolveStatusColors[
              SolveStatusList.indexOf(schedule.solveStatus)
            ] as "default" | "success" | "error" | "warning") || "default"
          }
          sx={{ marginLeft: 1 }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={() => solveSchedule(schedule.id)}
          sx={{ paddingLeft: 0.2, paddingRight: 0.2 }}
        >
          Solve
        </Button>
        <ScheduleValidateDialog scheduleId={schedule.id} />
      </Box>
    </Box>
  );
}
