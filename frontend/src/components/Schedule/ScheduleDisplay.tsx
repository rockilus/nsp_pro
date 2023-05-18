import React, { useContext, useState } from "react";
import dayjs, { Dayjs } from "dayjs";

import Grid from "@mui/material/Grid";

import ScheduleDatePicker from "./ScheduleDatePicker";
import WeekDataGrid from "./WeekDataGrid";
import { HospitalContext } from "../../context/HospitalContext";
import { ScheduleContext } from "../../context/ScheduleContext";

const generateDateArray = (startDate: Dayjs, numDays: number) => {
  const dateArray: Dayjs[] = [];
  for (let i = 0; i < numDays; i++) {
    dateArray.push(startDate.add(i, "day"));
  }
  return dateArray;
};

export default function ScheduleDisplay() {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [startWeekDate, setStartWeekDate] = useState<Dayjs | null>(
    dayjs().startOf("week")
  );
  const [numDays, setNumDays] = useState<number>(7);
  const [dateArray, setDateArray] = useState<Dayjs[]>(
    generateDateArray(startWeekDate || dayjs(), numDays)
  );
  const scheduleContext = useContext(ScheduleContext);
  const hospitalContext = useContext(HospitalContext);

  const handleGetSchedule = async () => {
    if (startWeekDate) {
      await scheduleContext.getScheduleXDays(
        hospitalContext.currentHospital?._id || "",
        startWeekDate,
        numDays
      );
    }
  };

  const handleSelectedDateChange = (newValue: Dayjs | null) => {
    setSelectedDate(newValue);
    setStartWeekDate(newValue?.startOf("week") || dayjs().startOf("week"));
    setDateArray(
      generateDateArray(
        newValue?.startOf("week") || dayjs().startOf("week"),
        numDays
      )
    );
  };

  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="stretch"
      spacing={2}
    >
      <Grid item xs={12}>
        <ScheduleDatePicker
          selectedDate={selectedDate}
          handleGetSchedule={handleGetSchedule}
          handleSelectedDateChange={handleSelectedDateChange}
        />
      </Grid>
      <Grid item xs={12}>
        <WeekDataGrid dateArray={dateArray} />
      </Grid>
    </Grid>
  );
}
