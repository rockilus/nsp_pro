import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Utils
import { dateToTimeZero } from "./dateUtils";
// Types
import { ShiftT } from "../components/Shift/types";
import { ScheduleT, StatsOptionsT } from "../components/Schedule/types";
import { RequestT } from "../components/Request/types";

dayjs.extend(utc);

export const emptyShift: ShiftT = {
  teamId: "",
  id: "",
  name: "",
  startTime: dayjs(),
  endTime: dayjs(),
  staffing: 0,
  color: "",
  isTimeOff: false,
  shiftProperties: [],
};

export const emptySchedule: ScheduleT = {
  id: "",
  teamId: "",
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
  teamId: "",
  startDate: dayjs.utc().startOf("day"),
  endDate: dayjs.utc().startOf("day"),
};

export const emptyRequest: RequestT = {
  id: "",
  workerId: "",
  date: dateToTimeZero(new Date()),
  shiftId: "",
  hard: true,
  status: "pending",
};
