import { ReplacementCategoryT, MostConstrainingReasonT } from '../types/replacement';
import dayjs from 'dayjs';
import React from 'react';

/**
 * Get category emoji indicator for replacement analysis
 * @param category - The replacement category
 * @returns Emoji string indicating the category (🟢 can_do, 🟠 could_do, 🔴 cant_do)
 */
export function getCategoryEmoji(
  category: ReplacementCategoryT | 'can_do' | 'could_do' | 'cant_do',
): string {
  switch (category) {
    case 'can_do':
      return '🟢';
    case 'could_do':
      return '🟠';
    case 'cant_do':
      return '🔴';
    default:
      return '⚪';
  }
}

/**
 * Format shift time range with +1 indicator if it ends the next day
 * @param startTime - Shift start time
 * @param endTime - Shift end time
 * @returns Formatted time string (e.g., "08:00 - 16:00" or "20:00 - 08:00+1")
 */
export function formatShiftTimeRange(
  startTime: dayjs.Dayjs | null | undefined,
  endTime: dayjs.Dayjs | null | undefined,
): string {
  if (!startTime || !endTime) return '';

  const start = startTime.format('HH:mm');
  const end = endTime.format('HH:mm');
  const endsNextDay = !endTime.isSame(startTime, 'day');

  return `${start} - ${end}${endsNextDay ? '⁺¹' : ''}`;
}

/**
 * Format weekly time with delta in hours
 * @param weeklyMinutes - Total weekly minutes
 * @param deltaMinutes - Change in weekly minutes
 * @returns JSX element with formatted weekly time and delta
 */
export function formatWeeklyTime(weeklyMinutes: number, deltaMinutes: number): React.ReactElement {
  const hours = Math.round(weeklyMinutes / 60);
  const deltaHours = Math.round(deltaMinutes / 60);

  return React.createElement(
    React.Fragment,
    null,
    `${hours}h/week`,
    deltaMinutes !== 0 &&
      React.createElement(
        'span',
        {
          style: {
            color: deltaMinutes > 0 ? 'red' : 'green',
          },
        },
        ' ',
        `(${deltaHours > 0 ? '+' : ''}${deltaHours}h)`,
      ),
  );
}

/**
 * Format monthly duties with delta
 * @param totalDuties - Total monthly duties
 * @param delta - Change in monthly duties
 * @returns JSX element with formatted monthly duties and delta
 */
export function formatMonthlyDuties(totalDuties: number, delta: number): React.ReactElement {
  return React.createElement(
    React.Fragment,
    null,
    `${totalDuties} duties/month`,
    delta !== 0 &&
      React.createElement(
        'span',
        {
          style: {
            color: delta > 0 ? 'red' : 'green',
          },
        },
        ' ',
        `(${delta > 0 ? '+' : ''}${delta})`,
      ),
  );
}

/**
 * Get translated reason label for the most constraining reason
 * @param reason - The most constraining reason enum value
 * @param t - Translation function that accepts a translation key
 * @returns Translated reason label
 */
export function getReasonLabel(
  reason: MostConstrainingReasonT,
  t: (key: string) => string,
): string {
  const reasonMap: Record<MostConstrainingReasonT, string> = {
    [MostConstrainingReasonT.NOT_EMPLOYED]: t('replacement_reason_not_employed'),
    [MostConstrainingReasonT.MISSING_SPECIALTY]: t('replacement_reason_missing_specialty'),
    [MostConstrainingReasonT.ON_LEAVE]: t('replacement_reason_on_leave'),
    [MostConstrainingReasonT.FILTERED_OUT]: t('replacement_reason_filtered_out'),
    [MostConstrainingReasonT.HAS_OVERLAP]: t('replacement_reason_has_overlap'),
    [MostConstrainingReasonT.HARD_CONSTRAINT_VIOLATION]: t(
      'replacement_reason_hard_constraint_violation',
    ),
    [MostConstrainingReasonT.REQUEST_CONFLICT]: t('replacement_reason_request_conflict'),
    [MostConstrainingReasonT.SOFT_CONSTRAINT_VIOLATION]: t(
      'replacement_reason_soft_constraint_violation',
    ),
    [MostConstrainingReasonT.NO_CONSTRAINTS_VIOLATED]: t(
      'replacement_reason_no_constraints_violated',
    ),
  };

  return reasonMap[reason] || reason;
}
