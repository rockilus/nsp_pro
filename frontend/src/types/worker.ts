import { AttributeT } from "./attribute";

export type WorkerT = {
  id: string;
  teamId: string;
  name: string;
  weeklyHours: number;
  weeklyHoursDesired: number;
  dutiesPerMonth: number;
  annualLeave: number;
  deleted: boolean;
  attributes: AttributeT[];
};
