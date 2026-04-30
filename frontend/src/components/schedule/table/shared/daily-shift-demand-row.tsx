import React, { useMemo } from 'react';
import { useTranslation } from '../../../../app/i18n/client';
// Components
import DemandsHeaderCell from './demands-header-cell';
import { countShifts, countStaffings } from './assignment-count-methods';
import CalendarRowHeaderCell from '../../../calendar/CalendarRowHeaderCell';
// Styles
import './daily-shift-demand-row.css';
// Types
import { ShiftT } from '../../../../types/shift';
import { periodDateT, ScheduleViewSettingsT } from '../../../../types/schedule';
import { ShiftDemandDTO } from '@/types/shiftDemand';
import { AssignmentT } from '@/types/assignment';

export default function DailyShiftDemandRow({
  lng,
  shifts,
  assignments,
  shiftDemands,
  periodDates,
  scheduleViewSettings,
}: {
  lng: string;
  shifts: ShiftT[];
  assignments: AssignmentT[];
  shiftDemands: ShiftDemandDTO[];
  periodDates: periodDateT[];
  scheduleViewSettings: ScheduleViewSettingsT;
}) {
  const { t } = useTranslation(lng, 'schedule-page');

  const counts = useMemo<{
    [date: string]: {
      [id: string]: {
        actual: number;
        target: number;
        staffingTotal: number;
      };
      total: {
        actual: number;
        target: number;
        staffingTotal: number;
      };
    };
  }>(() => {
    return scheduleViewSettings.groupBy === 'shift'
      ? countShifts(shifts, assignments, shiftDemands, periodDates)
      : countStaffings(shifts, assignments, shiftDemands, periodDates);
  }, [shifts, assignments, shiftDemands, periodDates, scheduleViewSettings]);

  return (
    <div className="flex border-b border-border/50 bg-card" data-testid="shift-count-row">
      <CalendarRowHeaderCell data-testid="shift-count-row-label" className="py-1">
        <span className="dsd-row-label text-xs font-medium text-muted-foreground">
          {scheduleViewSettings.groupBy === 'shift' ? t('shift_count') : t('worker_count')}
        </span>
      </CalendarRowHeaderCell>
      <div className="flex flex-1">
        {periodDates.map((pDate, dateIndex) => {
          const dateStr = pDate.date.format('YYYY-MM-DD');
          return (
            <DemandsHeaderCell
              key={dateIndex}
              lng={lng}
              shifts={shifts}
              counts={
                counts[dateStr] || {
                  total: { actual: 0, target: 0, staffingTotal: 0 },
                }
              }
              scheduleViewSettings={scheduleViewSettings}
            />
          );
        })}
      </div>
    </div>
  );
}
