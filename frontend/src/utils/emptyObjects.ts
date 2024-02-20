import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { ShiftDefaultT } from "../components/Shift/types";
import { ScheduleT, StatsOptionsT } from "../components/Schedule/types";

dayjs.extend(utc);

export const emptyShiftDefault: ShiftDefaultT = {
  id: "",
  name: "",
  startTime: dayjs(),
  endTime: dayjs(),
  staffing: 0,
  color: "",
  isTimeOff: false,
};

export const emptySchedule: ScheduleT = {
  id: "",
  startDate: dayjs.utc().startOf("day"),
  endDate: dayjs.utc().startOf("day"),
  solveStatus: "Not solved",
  status: "WIP",
  missingCoverageDates: [],
  // assignments: [],
  // objectiveBreaches: [],
  // stats: [],
};

export const emptyStatsOptions: StatsOptionsT = {
  id: "",
  startDate: dayjs.utc().startOf("day"),
  endDate: dayjs.utc().startOf("day"),
};
