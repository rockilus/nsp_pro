import React, { useState } from "react";
import dayjs from "dayjs";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { ScheduleOptionsT } from "./types";

interface Props {
  shiftSchedule: boolean;
  displayCBs: boolean;
  addSchedule: (scheduleOptions: ScheduleOptionsT) => void;
  switchScheduleDisplay: () => void;
  switchDisplayCBs: () => void;
}

export default function ScheduleOptions({
  shiftSchedule,
  displayCBs,
  addSchedule,
  switchScheduleDisplay,
  switchDisplayCBs,
  addCBDisplayed,
}: Props) {
  const dateToTimeZero = (date: Date): Date => {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0)
    );
  };

  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOptionsT>({
    startDate: dateToTimeZero(new Date(Date.UTC(2023, 9, 2, 0, 0, 0))),
    endDate: dateToTimeZero(new Date(Date.UTC(2023, 9, 15, 0, 0, 0))),
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Typography variant="subtitle1" align="left">
        Solver options
      </Typography>
      <DatePicker
        value={dayjs(scheduleOptions.startDate)}
        onChange={(newValue) =>
          setScheduleOptions({
            ...scheduleOptions,
            startDate: dateToTimeZero(newValue?.toDate() || new Date()),
          })
        }
      />
      <DatePicker
        value={dayjs(scheduleOptions.endDate)}
        onChange={(newValue) =>
          setScheduleOptions({
            ...scheduleOptions,
            endDate: dateToTimeZero(newValue?.toDate() || new Date()),
          })
        }
      />
      <Button
        variant="contained"
        color="primary"
        onClick={() => addSchedule(scheduleOptions)}
      >
        Solve
      </Button>
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
