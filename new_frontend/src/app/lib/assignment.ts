import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { AssignmentT } from "../../types/schedule_temp";

dayjs.extend(utc);

const apiUrlSchedule = process.env.NEXT_PUBLIC_API_URL + "/schedules";

export const toAssignmentT = (data: any): AssignmentT => {
  return {
    ...data,
    date: dayjs.utc(data.date),
  };
};
