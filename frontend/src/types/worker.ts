import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
// Types
import { AttributeT } from './attribute';

dayjs.extend(utc);

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

/**
 * Convert raw API data to WorkerT
 */
export function toWorkerT(data: any): WorkerT {
  return {
    ...data,
    employmentStartDate: dayjs.unix(data.employmentStartDate).utc(),
    employmentEndDate: data.employmentEndDate ? dayjs.unix(data.employmentEndDate).utc() : null,
  };
}

/**
 * Convert WorkerT to API request payload
 */
export function fromWorkerT(data: WorkerT): any {
  return {
    ...data,
    employmentStartDate: data.employmentStartDate.unix(),
    employmentEndDate: data.employmentEndDate ? data.employmentEndDate.unix() : null,
  };
}
