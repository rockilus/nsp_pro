import dayjs from "dayjs";

import { ShiftDefaultT } from "../components/Shift/types";

export const emptyShiftDefault: ShiftDefaultT = {
  id: "",
  name: "",
  startTime: dayjs(),
  endTime: dayjs(),
  staffing: 0,
  color: "",
  isTimeOff: false,
};
