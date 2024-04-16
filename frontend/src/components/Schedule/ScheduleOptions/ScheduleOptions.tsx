import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
// Components
import SchedulePanelDialog from "../SchedulePanelDialog";
import ScheduleWIP from "./ScheduleWIP";
// Types
import { ScheduleT } from "../types";
import { TeamT } from "../../../containers/types";
// Utils
import { emptySchedule } from "../../../utils/emptyObjects";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  schedules: ScheduleT[];
}

export default function ScheduleOptions({ team, schedules }: Props) {
  const scheduleWIP = schedules.find((schedule) => schedule.status === "WIP");
  const scheduleWIPStartDate =
    schedules.length > 0
      ? schedules
          .filter((schedule) => schedule.status === "validated")
          ?.reduce(
            (latestSchedule, currentSchedule) =>
              currentSchedule.endDate > latestSchedule.endDate
                ? currentSchedule
                : latestSchedule,
            { endDate: dayjs.utc().startOf("day") }
          )
          .endDate.startOf("day") || dayjs.utc().startOf("day")
      : dayjs.utc().startOf("day");
  const newScheduleWIP = {
    ...emptySchedule,
    teamId: team.id,
    startDate: scheduleWIPStartDate.add(1, "day"),
    endDate: scheduleWIPStartDate.add(1, "month"),
  };

  const createScheduleButton = () => {
    return (
      <Button variant="contained" sx={{ paddingLeft: 0.3, paddingRight: 1 }}>
        <AddIcon />
        Schedule
      </Button>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
        border: "1px solid grey",
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 45,
          paddingLeft: 1,
          borderBottom: "1px solid lightgrey",
          backgroundColor: "grey.100",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <Typography
          variant="subtitle1"
          align="left"
          sx={{ fontWeight: "bold" }}
        >
          Schedules
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        {scheduleWIP ? (
          <ScheduleWIP team={team} schedule={scheduleWIP} />
        ) : (
          <SchedulePanelDialog
            team={team}
            buttonElement={createScheduleButton()}
            schedule={newScheduleWIP}
          />
        )}
      </Box>
    </Box>
  );
}
