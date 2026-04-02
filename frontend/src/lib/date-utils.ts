import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Dayjs } from 'dayjs';

dayjs.extend(utc);

export const formatToInput = (d?: Dayjs | null): string => (d ? d.utc().format('YYYY-MM-DD') : '');

export const parseFromInput = (s?: string | null, asUtc = true): Dayjs | null => {
  if (!s) return null;
  return asUtc ? dayjs.utc(s).startOf('day') : dayjs(s).startOf('day');
};

export const toDate = (d?: Dayjs | null): Date | null => (d ? d.utc().toDate() : null);

// Format a Dayjs date for display according to locale preferences.
// Default is day-first (DD/MM/YYYY); English (`en`) uses month-first (MM/DD/YYYY).
export const formatLocalDate = (d?: Dayjs | null, lng?: string): string => {
  if (!d) return '';
  const fmt = lng && lng.toLowerCase().startsWith('en') ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
  return (d as Dayjs).utc().format(fmt);
};

export default { formatToInput, parseFromInput, toDate, formatLocalDate };
