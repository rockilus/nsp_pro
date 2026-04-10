import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Dayjs } from 'dayjs';

dayjs.extend(utc);

export const formatToInput = (d?: Dayjs | null): string => (d ? d.utc().format('YYYY-MM-DD') : '');

export const parseFromInput = (s?: string | null, asUtc = true): Dayjs | null => {
  if (!s) return null;
  return asUtc ? dayjs.utc(s).startOf('day') : dayjs(s).startOf('day');
};

export const formatToInputDateTime = (d?: Dayjs | null): string =>
  d ? d.utc().format('YYYY-MM-DDTHH:mm') : '';

export const parseFromInputDateTime = (s?: string | null, asUtc = true): Dayjs | null => {
  if (!s) return null;
  // Interpret the user-entered local-style datetime string as UTC per app decision
  return asUtc ? dayjs.utc(s) : dayjs(s);
};

export const toDate = (d?: Dayjs | null): Date | null => (d ? d.utc().toDate() : null);

const dateUtils = { formatToInput, parseFromInput, toDate };

export default dateUtils;
