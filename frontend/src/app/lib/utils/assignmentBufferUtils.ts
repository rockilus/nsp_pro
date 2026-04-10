/**
 * Utilities for calculating assignment loading buffer windows
 *
 * Strategy: Load assignments in monthly buffers (previous, current, next months)
 * to balance data freshness with performance.
 */

import dayjs from 'dayjs';

export interface BufferRange {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
}

/**
 * Calculate a 3-month buffer window around the given period
 *
 * Returns:
 * - start: First day of (earliest month in period - 1 month)
 * - end: Last day of (latest month in period + 1 month)
 *
 * Examples:
 * - Period Jan 15 - Feb 14 → Buffer Dec 1 - Mar 31
 * - Period Feb 1 - Feb 29 → Buffer Jan 1 - Mar 31
 * - Period Dec 25 - Jan 5 → Buffer Nov 1 - Feb 28/29
 *
 * @param periodStart - Start of the visible period
 * @param periodEnd - End of the visible period
 * @returns Buffer range covering previous, current, and next months
 */
export function calculateBufferMonths(
  periodStart: dayjs.Dayjs,
  periodEnd: dayjs.Dayjs,
): BufferRange {
  // Find the earliest and latest months in the period
  const earliestMonth = periodStart.startOf('month');
  const latestMonth = periodEnd.startOf('month');

  // Extend by one month in each direction
  const bufferStart = earliestMonth.subtract(1, 'month');
  const bufferEnd = latestMonth.add(1, 'month').endOf('month');

  return {
    start: bufferStart,
    end: bufferEnd,
  };
}

/**
 * Determine if more assignments should be fetched based on buffer coverage
 *
 * Returns true if the new period extends beyond the current buffer by more than 50%
 * of a month, indicating we need to fetch additional data.
 *
 * @param currentBuffer - Currently loaded buffer range
 * @param newPeriodStart - Start of new period to check
 * @param newPeriodEnd - End of new period to check
 * @returns True if additional data should be fetched
 */
export function shouldFetchMore(
  currentBuffer: BufferRange | null,
  newPeriodStart: dayjs.Dayjs,
  newPeriodEnd: dayjs.Dayjs,
): boolean {
  // If no buffer exists, always fetch
  if (!currentBuffer) {
    return true;
  }

  // Check if new period extends significantly beyond current buffer
  // "Significantly" = more than 15 days outside the buffer
  const threshold = 15;

  const beforeStart = currentBuffer.start.diff(newPeriodStart, 'day');
  const afterEnd = newPeriodEnd.diff(currentBuffer.end, 'day');

  // Need to fetch if new period extends more than threshold days beyond buffer
  return beforeStart > threshold || afterEnd > threshold;
}

/**
 * Calculate buffer for extended week ranges (mobile use case)
 *
 * Mobile displays ±8 weeks from the current period, so we need a larger buffer.
 * This calculates buffer based on the full visible range, not just the current period.
 *
 * @param centerDate - Center date for the mobile view
 * @param weeksRadius - Number of weeks to display in each direction (default 8)
 * @returns Buffer range covering all visible weeks plus margins
 */
export function calculateMobileBufferMonths(
  centerDate: dayjs.Dayjs,
  weeksRadius: number = 8,
): BufferRange {
  // Calculate the full visible range
  const visibleStart = centerDate.subtract(weeksRadius, 'week').startOf('isoWeek');
  const visibleEnd = centerDate.add(weeksRadius, 'week').endOf('isoWeek');

  // Use the standard buffer calculation on this extended range
  return calculateBufferMonths(visibleStart, visibleEnd);
}

/**
 * Check if two buffer ranges are equivalent (within 1 day tolerance)
 *
 * Used to avoid unnecessary refetches when buffer hasn't meaningfully changed.
 *
 * @param buffer1 - First buffer range
 * @param buffer2 - Second buffer range
 * @returns True if buffers are approximately equal
 */
export function areBuffersEquivalent(
  buffer1: BufferRange | null,
  buffer2: BufferRange | null,
): boolean {
  if (!buffer1 || !buffer2) {
    return buffer1 === buffer2;
  }

  // Buffers are equivalent if start/end dates are within 1 day
  const startDiff = Math.abs(buffer1.start.diff(buffer2.start, 'day'));
  const endDiff = Math.abs(buffer1.end.diff(buffer2.end, 'day'));

  return startDiff <= 1 && endDiff <= 1;
}
