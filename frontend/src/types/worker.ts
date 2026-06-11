import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
// Types
import { AttributeT } from './attribute';

dayjs.extend(utc);

// ─── Weekly Preferences ──────────────────────────────────────────────────────

export type WeekParity = 'all' | 'even' | 'odd';

export type SlotRestriction = 'no_work' | 'no_normal' | 'no_duty' | 'no_specific';

export type WeeklySlotPreference = {
  dayOfWeek: number; // 0=Monday … 6=Sunday
  slot: 'morning' | 'afternoon' | 'night';
  restriction: SlotRestriction;
  shiftIds: string[];
  weekParity: WeekParity;
};

export type WeeklyPreferences = {
  enabled: boolean;
  slots: WeeklySlotPreference[];
};

// ─── Worker ───────────────────────────────────────────────────────────────────

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
  weeklyPreferences?: WeeklyPreferences;
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
