import dayjs from "dayjs";

import { ShiftDefaultT } from "../components/Shift/types";
import { ScheduleT } from "../components/Schedule/types";

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
  startDate: dayjs(),
  endDate: dayjs(),
  solveStatus: "",
  status: "",
  missingCoverageDates: [],
  assignments: [],
  objectiveBreaches: [],
  stats: [],
};
