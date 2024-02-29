import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
// Components
import SchedulePanelDialog from "./SchedulePanelDialog";
import ScheduleValidateDialog from "./ScheduleValidateDialog";
// Stores
import { useScheduleStore } from "../../stores/scheduleStore";
// Types
import { ScheduleT } from "./types";
import { SolveStatusList, SolveStatusColors } from "../../utils/constants";
import { TeamT } from "../../containers/types";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  schedule: ScheduleT;
}

export default function ScheduleWIP({ team, schedule }: Props) {
  const [isSolving, setIsSolving] = useState(false);
  const solveSchedule = useScheduleStore((state) => state.solveSchedule);

  const handleSolve = () => {
    setIsSolving(true);
    solveSchedule(schedule.id, team.id);
    setIsSolving(false);
  };

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
            team={team}
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
        {isSolving ? (
          <div
            style={{
              backgroundColor: "#1976d2",
              height: "36.5px",
              width: "64px",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <CircularProgress size={20} sx={{ color: "white" }} />
          </div>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSolve}
            sx={{ paddingLeft: 0.2, paddingRight: 0.2 }}
          >
            Solve
          </Button>
        )}
        <ScheduleValidateDialog team={team} scheduleId={schedule.id} />
      </Box>
    </Box>
  );
}
