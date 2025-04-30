import dayjs from "dayjs";
// Types
import { AttributeT } from "./attribute";

export type WorkerT = {
  id: string;
  teamId: string;
  name: string;
  acronym: string;
  acronymCustom: boolean;
  employmentStartDate: dayjs.Dayjs;
  employmentEndDate: dayjs.Dayjs | null;
  weeklyHours: number;
  weeklyHoursDesired: number;
  dutiesPerMonth: number;
  annualLeave: number;
  specialtyIds: string[];
  deleted: boolean;
  userId: string | null;
  attributes: AttributeT[];
};
