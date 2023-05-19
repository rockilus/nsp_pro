import React, { useContext, useState } from "react";
import dayjs, { Dayjs } from "dayjs";

import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { HospitalContext } from "../../context/HospitalContext";
import { ScheduleContext } from "../../context/ScheduleContext";
import { AuthContext } from "../../context/AuthContext";

export default function DatePickerValue() {
  const hospitalContext = useContext(HospitalContext);
  const scheduleContext = useContext(ScheduleContext);
  const authContext = useContext(AuthContext);
  const [startDate, setStartDate] = useState<Dayjs>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs>(dayjs());

  // const handleGetSchedule = async () => {
  //   if (hospitalContext.currentHospital) {
  //     await scheduleContext.getSchedule(hospitalContext.currentHospital._id);
  //   }
  //   console.log("scheduleContext", scheduleContext);
  // };

  const handleBuildSchedule = async () => {
    if (hospitalContext.currentHospital && authContext.currentUser) {
      await scheduleContext.buildSchedule(
        hospitalContext.currentHospital._id,
        authContext.currentUser._id,
        startDate,
        endDate
      );
    }
  };

  const handleClickNextMonth = () => {
    const today = dayjs();
    const startOfNextMonth = today.endOf("month").add(1, "day");
    const endOfNextMonth = startOfNextMonth.endOf("month");
    setStartDate(startOfNextMonth);
    setEndDate(endOfNextMonth);
  };

  const handleClickNextThreeMonths = () => {
    const today = dayjs();
    const startOfNextMonth = today.endOf("month").add(1, "day");
    const startOfNextThreeMonths = startOfNextMonth.add(2, "month");
    const endOfNextMonth = startOfNextThreeMonths.endOf("month");
    setStartDate(startOfNextMonth);
    setEndDate(endOfNextMonth);
  };

  const handleClickNextTwelveMonths = () => {
    const today = dayjs();
    const startOfNextMonth = today.endOf("month").add(1, "day");
    const startOfNextThreeMonths = startOfNextMonth.add(11, "month");
    const endOfNextMonth = startOfNextThreeMonths.endOf("month");
    setStartDate(startOfNextMonth);
    setEndDate(endOfNextMonth);
  };

  const handleClickReset = () => {
    setStartDate(dayjs());
    setEndDate(dayjs());
  };

  return (
    <Grid
      container
      direction="column"
      justifyContent="flex-start"
      alignItems="center"
    >
      <Grid
        container
        direction="row"
        justifyContent="flex-start"
        alignItems="center"
        spacing={2}
      >
        <Grid item>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(newValue) => {
              if (newValue !== null) {
                setStartDate(newValue);
              }
            }}
          />
        </Grid>
        <Grid item>
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(newValue) => {
              if (newValue !== null) {
                setEndDate(newValue);
              }
            }}
          />
        </Grid>
        {/* <Grid item>
          <Button variant="contained" onClick={handleGetSchedule}>
            Get Schedule
          </Button>
        </Grid> */}
        <Grid item>
          <Button variant="contained" onClick={handleBuildSchedule}>
            Build Schedule
          </Button>
        </Grid>
      </Grid>
      <Grid
        container
        direction="row"
        justifyContent="flex-start"
        alignItems="center"
        spacing={1}
      >
        <Grid item>
          <Chip label="Next Month" onClick={handleClickNextMonth} />
        </Grid>
        <Grid item>
          <Chip label="Next 3 Months" onClick={handleClickNextThreeMonths} />
        </Grid>
        <Grid item>
          <Chip label="Next 12 Months" onClick={handleClickNextTwelveMonths} />
        </Grid>
        <Grid item>
          <Chip label="Reset" onClick={handleClickReset} />
        </Grid>
      </Grid>
    </Grid>
  );
}
