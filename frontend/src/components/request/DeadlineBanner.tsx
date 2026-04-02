import React from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/fr';
import 'dayjs/locale/es';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CalendarClock } from 'lucide-react';
import { useTranslation } from '../../app/i18n/client';

dayjs.extend(utc);

interface DeadlineBannerProps {
  lng: string;
  periodStart?: dayjs.Dayjs | null;
  periodEnd?: dayjs.Dayjs | null;
  deadline?: dayjs.Dayjs | null;
  className?: string;
}

function formatPeriod(start: dayjs.Dayjs, end: dayjs.Dayjs, lng: string) {
  // If same year, hide year on the start
  if (start.year() === end.year()) {
    if (lng.startsWith('fr') || lng.startsWith('es')) {
      const sMonth = start.locale(lng).format('MMM').replace('.', '').toLowerCase();
      const eMonth = end.locale(lng).format('MMM').replace('.', '').toLowerCase();
      const sStr = `${start.format('DD')} ${sMonth}`;
      const eStr = `${end.format('DD')} ${eMonth} ${end.year()}`;
      return `${sStr} – ${eStr}`;
    }
    return `${start.format('DD MMM')} – ${end.format('DD MMM YYYY')}`;
  }
  return `${start.format('DD MMM YYYY')} – ${end.format('DD MMM YYYY')}`;
}

function formatDeadline(deadline: dayjs.Dayjs, lng: string) {
  const d = deadline.locale(lng);
  if (lng.startsWith('fr')) {
    const month = d.format('MMM').replace('.', '').toLowerCase();
    return `${d.format('D')} ${month} à ${d.format('HH')}h${d.format('mm')}`;
  }
  if (lng.startsWith('es')) {
    const month = d.format('MMM').replace('.', '').toLowerCase();
    return `${d.format('D')} ${month} a las ${d.format('HH:mm')}`;
  }
  return d.format('MMM D [at] h:mm A');
}

export default function DeadlineBanner({
  lng,
  periodStart,
  periodEnd,
  deadline,
  className,
}: DeadlineBannerProps) {
  const { t } = useTranslation(lng, 'request-page');

  if (!deadline) return null;

  const period = periodStart && periodEnd ? formatPeriod(periodStart, periodEnd, lng) : undefined;
  const deadlineStr = formatDeadline(deadline, lng);

  return (
    <Alert className={className}>
      <CalendarClock className="size-4" />
      <div>
        {period && <AlertTitle>{t('request_deadline_banner_period', { period })}</AlertTitle>}
        <AlertDescription>
          {t('request_deadline_banner_submission', { deadline: deadlineStr })}
        </AlertDescription>
      </div>
    </Alert>
  );
}
