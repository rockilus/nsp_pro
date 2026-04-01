import React from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '../../app/i18n/client';
// MUI
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// Components
import RequestDeadlinePanel from './request-deadline-panel';
// Styles
import './schedule-selector.css';
import '../../styles/text-styles.css';

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

  return (
    <div className="campaign-info-container">
      <div className="campaign-info">
        <span className="title">{t('campaign')}</span>
        <div className="campaign-info-row">
          <div className="row-label-container">
            <span className="row-label">{t('start')}</span>
          </div>
          <div className="row-value-container">
            <DatePicker
              className="custom-date-picker"
              minDate={minDate}
              value={scheduleCampaign.startDate}
              onChange={(newValue) => {
                if (!newValue) return;
                const newStart = dayjs.utc(newValue);
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
            />
          </div>
        </div>
        <div className="campaign-info-row">
          <div className="row-label-container">
            <span className="row-label">{t('end')}</span>
          </div>
          <div className="row-value-container">
            <DatePicker
              className="custom-date-picker"
              minDate={scheduleCampaign.startDate}
              maxDate={maxEndFromStart ?? undefined}
              value={scheduleCampaign.endDate}
              onChange={(newValue) => {
                if (!newValue) return;
                const candidate = dayjs.utc(newValue);
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
            />
          </div>
        </div>
        <RequestDeadlinePanel
          lng={lng}
          scheduleCampaign={scheduleCampaign}
          onDeadlineSet={onDeadlineSet}
          onDeadlineExtended={onDeadlineExtended}
          onReminderSent={onReminderSent}
        />
      </div>
    </div>
  );
}
