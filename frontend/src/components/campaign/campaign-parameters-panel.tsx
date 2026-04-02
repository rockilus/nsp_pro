import React from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../app/i18n/client';
// shadcn/ui
import { DatePickerInput } from '@/components/ui/date-picker-input';
// Components
import RequestDeadlinePanel from './request-deadline-panel';
import { formatToInput, parseFromInput } from '@/lib/date-utils';
// Types
import { ScheduleT } from '../../types/schedule';
// Constants
import { MAX_SCHEDULE_DURATION_MONTHS } from '../../constants/constants';

dayjs.extend(utc);

export default function CampaignParametersPanel({
  lng,
  scheduleCampaign,
  schedulesValidated,
  handleUpdateSchedule,
  onDeadlineSet,
  onDeadlineExtended,
  onReminderSent,
}: {
  lng: string;
  scheduleCampaign: ScheduleT;
  schedulesValidated: ScheduleT[];
  handleUpdateSchedule: (schedule: ScheduleT) => void;
  onDeadlineSet: (schedule: ScheduleT) => void;
  onDeadlineExtended: (schedule: ScheduleT) => void;
  onReminderSent: (schedule: ScheduleT) => void;
}) {
  const { t } = useTranslation(lng, 'campaign-page');

  const lastScheduleValidatedDate = schedulesValidated.reduce((latestDate, schedule) => {
    return schedule.endDate.isAfter(latestDate) ? schedule.endDate : latestDate;
  }, dayjs(0));
  const today = dayjs.utc().startOf('day');
  const minDate = lastScheduleValidatedDate.add(1, 'day').isAfter(today)
    ? lastScheduleValidatedDate.add(1, 'day')
    : today;

  const maxEndFromStart = scheduleCampaign.startDate
    ? scheduleCampaign.startDate.add(MAX_SCHEDULE_DURATION_MONTHS, 'month')
    : null;

  const dateInputClass =
    'h-9 w-40 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

  const norm = (d?: Dayjs | string | null) => {
    if (!d) return undefined;
    return typeof d === 'string' ? d : (d as Dayjs).utc().format('YYYY-MM-DD');
  };

  return (
    <div className="flex w-full flex-col self-start">
      <div className="flex w-full flex-col">
        <span className="mb-1 text-xl font-semibold text-[#3c4043]">{t('campaign')}</span>
        {/* Start date row */}
        <div className="flex min-h-[45px] flex-row items-center py-0.5">
          <div className="flex w-[150px] items-center">
            <span className="text-sm text-[#3c4043]">{t('start')}</span>
          </div>
          <div className="flex items-center">
            <input
              type="date"
              value={formatToInput(scheduleCampaign.startDate)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newStart = parseFromInput(e.target.value);
                if (!newStart) return;
                const maxEndForNewStart = newStart.add(MAX_SCHEDULE_DURATION_MONTHS, 'month');
                const newEnd = scheduleCampaign.endDate.isAfter(maxEndForNewStart)
                  ? maxEndForNewStart
                  : scheduleCampaign.endDate;
                handleUpdateSchedule({
                  ...scheduleCampaign,
                  startDate: newStart,
                  endDate: newEnd,
                });
              }}
              min={norm(minDate)}
              className={dateInputClass}
            />
          </div>
        </div>
        {/* End date row */}
        <div className="flex min-h-[45px] flex-row items-center py-0.5">
          <div className="flex w-[150px] items-center">
            <span className="text-sm text-[#3c4043]">{t('end')}</span>
          </div>
          <div className="flex items-center">
            <input
              type="date"
              value={formatToInput(scheduleCampaign.endDate)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newEnd = parseFromInput(e.target.value);
                if (!newEnd) return;
                const candidate = newEnd;
                const maxAllowed = scheduleCampaign.startDate.add(
                  MAX_SCHEDULE_DURATION_MONTHS,
                  'month',
                );
                const finalEnd = candidate.isAfter(maxAllowed) ? maxAllowed : candidate;
                handleUpdateSchedule({
                  ...scheduleCampaign,
                  endDate: finalEnd,
                });
              }}
              min={norm(scheduleCampaign.startDate)}
              max={norm(maxEndFromStart)}
              className={dateInputClass}
            />
          </div>
        </div>
        {/* Requests submission deadline row */}
        <div className="flex min-h-[45px] flex-row items-center py-0.5">
          <div className="flex w-[150px] items-center">
            <span className="text-sm text-[#3c4043]">{t('request_deadline')}</span>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <RequestDeadlinePanel
              lng={lng}
              scheduleCampaign={scheduleCampaign}
              onDeadlineSet={onDeadlineSet}
              onDeadlineExtended={onDeadlineExtended}
              onReminderSent={onReminderSent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
