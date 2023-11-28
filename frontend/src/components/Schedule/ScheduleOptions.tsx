import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import SchedulePanelDialog from "./SchedulePanelDialog";
import ScheduleWIP from "./ScheduleWIP";
import { ScheduleT } from "./types";
import { emptySchedule } from "../../utils/emptyObjects";

dayjs.extend(utc);

interface Props {
  schedules: ScheduleT[];
  shiftSchedule: boolean;
  displayCBs: boolean;
  addSchedule: (schedule: ScheduleT) => void;
  switchScheduleDisplay: () => void;
  switchDisplayCBs: () => void;
}

export default function ScheduleOptions({
  schedules,
  shiftSchedule,
  displayCBs,
  addSchedule,
  switchScheduleDisplay,
  switchDisplayCBs,
}: Props) {
  const scheduleWIP = schedules.find((schedule) => schedule.status === "WIP");

  const statusList = [
    "Solved",
    "No solution",
    "Soft breached",
    "Hard breached",
  ];
  const colorList = ["success", "error", "warning", "error"];

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
          schedule={emptySchedule}
        />
      )}
      {/* <Typography variant="subtitle1" align="left">
        Solver options
      </Typography>
      <DatePicker
        value={scheduleOptions.startDate}
        onChange={(newValue) =>
          setScheduleOptions({
            ...scheduleOptions,
            startDate: newValue ? dayjs.utc(newValue) : dayjs.utc(),
          })
        }
      />
      <DatePicker
        value={scheduleOptions.endDate}
        onChange={(newValue) =>
          setScheduleOptions({
            ...scheduleOptions,
            endDate: newValue ? dayjs.utc(newValue) : dayjs.utc(),
          })
        }
      />
      <Button
        variant="contained"
        color="primary"
        onClick={() => addSchedule(scheduleOptions)}
      >
        Solve
      </Button> */}
      {/* <Divider sx={{ marginTop: 2, marginBottom: 2 }} />
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <Typography variant="body2" align="left">
          Status:
        </Typography>
        <Chip
          label={schedules.status}
          color={
            (colorList[statusList.indexOf(schedules.status)] as
              | "success"
              | "error"
              | "warning") || "default"
          }
          sx={{ marginLeft: 1 }}
        />
      </Box> */}
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
