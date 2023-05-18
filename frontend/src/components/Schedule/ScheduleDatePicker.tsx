import React, { useContext, useState } from "react";
import dayjs, { Dayjs } from "dayjs";

import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

// import { HospitalContext } from "../../context/HospitalContext";
// import { ScheduleContext } from "../../context/ScheduleContext";

interface ScheduleDatePickerProps {
  selectedDate: Dayjs | null;
  handleGetSchedule: () => void;
  handleSelectedDateChange: (newValue: Dayjs | null) => void;
}

export default function ScheduleDatePicker(props: ScheduleDatePickerProps) {
  // const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  // const scheduleContext = useContext(ScheduleContext);
  // const hospitalContext = useContext(HospitalContext);

  // const handleGetSchedule = async () => {
  //   if (selectedDate) {
  //     const startWeekDate = selectedDate.startOf("week");
  //     await scheduleContext.getScheduleXDays(
  //       hospitalContext.currentHospital?._id || "",
  //       startWeekDate,
  //       7
  //     );
  //   }
  // };

  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="stretch"
      spacing={2}
    >
      <Grid item xs={12}>
        <DatePicker
          label="Controlled picker"
          value={props.selectedDate}
          onChange={(newValue) => props.handleSelectedDateChange(newValue)}
          showDaysOutsideCurrentMonth
        />
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" onClick={props.handleGetSchedule}>
          Get Schedule
        </Button>
      </Grid>
    </Grid>
  );
}
