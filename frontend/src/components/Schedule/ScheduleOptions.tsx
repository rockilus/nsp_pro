import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";

import SchedulePanelDialog from "./SchedulePanelDialog";
import ScheduleWIP from "./ScheduleWIP";
import { ScheduleT } from "./types";
import { emptySchedule } from "../../utils/emptyObjects";

dayjs.extend(utc);

interface Props {
  schedules: ScheduleT[];
  shiftSchedule: boolean;
  displayCBs: boolean;
  switchScheduleDisplay: () => void;
  switchDisplayCBs: () => void;
}

export default function ScheduleOptions({
  schedules,
  shiftSchedule,
  displayCBs,
  switchScheduleDisplay,
  switchDisplayCBs,
}: Props) {
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
    startDate: scheduleWIPStartDate.add(1, "day"),
    endDate: scheduleWIPStartDate.add(1, "month"),
  };

  const createScheduleButton = () => {
    return <Button variant="contained">Create schedule</Button>;
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "grey.100",
      }}
    >
      {scheduleWIP ? (
        <ScheduleWIP schedule={scheduleWIP} />
      ) : (
        <SchedulePanelDialog
          buttonElement={createScheduleButton()}
          schedule={newScheduleWIP}
        />
      )}
      <Divider sx={{ marginTop: 2, marginBottom: 2 }} />
      <Typography variant="subtitle1" align="left">
        Display options
      </Typography>
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={!shiftSchedule}
              onChange={() => switchScheduleDisplay()}
              inputProps={{ "aria-label": "controlled" }}
            />
          }
          label="Shift - Worker"
        />
      </FormGroup>
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={displayCBs}
              onChange={() => switchDisplayCBs()}
              inputProps={{ "aria-label": "controlled" }}
            />
          }
          label="Constraint Breaches"
        />
      </FormGroup>
    </Box>
  );
}
