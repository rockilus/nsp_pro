import dayjs from "dayjs";
// MUI
import { grey, brown } from "@mui/material/colors";
// Types
import { BreachT, ScheduleT } from "../../types/schedule";

export const getBreachType = (breaches: BreachT[]): string => {
  if (breaches.length === 0) {
    return "noBreach";
  }
  if (breaches.some((breach) => breach.hardToSoft)) {
    return "hardBreach";
  }
  return "softBreach";
};

export const getCellBackgroundColor = (
  date: dayjs.Dayjs,
  schedule: ScheduleT
) => {
  if (date.isBefore(dayjs.utc(dayjs().startOf("day")))) {
    return brown[50];
  }
  if (date.isBefore(schedule.startDate)) {
    return grey[50];
  }
  return "none";
};
