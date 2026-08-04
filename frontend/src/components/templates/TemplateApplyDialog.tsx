'use client';

import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useTranslation } from '../../app/i18n/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ScheduleTemplateDTO,
  ScheduleTemplateApplicationResult,
  ApplyScheduleTemplateToDateRangeDTO,
  TemplateType,
  SCHEDULE_TEMPLATE_CONSTRAINTS,
} from '../../types/schedule-template';

dayjs.extend(utc);
dayjs.extend(isSameOrBefore);

interface TemplateApplyDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  template: ScheduleTemplateDTO;
  teamId: string;
  onApply: (
    request: ApplyScheduleTemplateToDateRangeDTO,
  ) => Promise<ScheduleTemplateApplicationResult>;
  onComplete: (result: ScheduleTemplateApplicationResult) => void;
}

export function TemplateApplyDialog({
  lng,
  open,
  onClose,
  template,
  onApply,
  onComplete,
}: TemplateApplyDialogProps) {
  const { t } = useTranslation(lng, 'schedule-templates');

  const defaultStart = dayjs.utc().add(1, 'month').startOf('day');
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(defaultStart);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(defaultStart);
  const [startWeekNumber, setStartWeekNumber] = useState(0);
  const [overwriteDemands, setOverwriteDemands] = useState(true);
  const [overwriteAssignments, setOverwriteAssignments] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState('');

  const weekOptions = useMemo(() => {
    return Array.from({ length: template.weeksData.length }, (_, i) => ({
      value: i,
      label: t('week_number', { number: i + 1 }),
    }));
  }, [template.weeksData.length, t]);

  const estimatedStats = useMemo(() => {
    if (!startDate || !endDate) return null;

    let demandsCount = 0;
    let assignmentsCount = 0;
    let current = startDate;
    const end = endDate;

    if (template.templateType === TemplateType.EVEN_ODD) {
      const startMonday = current.startOf('isoWeek');
      const daysSinceEpoch = startMonday.diff(dayjs.utc('1970-01-05'), 'day');
      const weekNum = Math.floor(daysSinceEpoch / 7);
      var templateWeek = weekNum % 2 === 0 ? 0 : 1;
    } else {
      var templateWeek = startWeekNumber;
    }

    const weekCycleLen = template.weeksData.length;

    while (current.isSameOrBefore(end, 'day')) {
      const weekday = current.isoWeekday() - 1;
      const weekData = template.weeksData[templateWeek];
      if (weekData) {
        const dayEntries = weekData.entries.filter((e) => e.dayOfWeek === weekday);
        demandsCount += dayEntries.reduce((s, e) => s + e.demandCount, 0);
        assignmentsCount += dayEntries.reduce((s, e) => s + e.workerIds.length, 0);
      }
      current = current.add(1, 'day');
      if (current.isoWeekday() === 1) {
        if (template.templateType === TemplateType.STANDARD) {
          templateWeek = (templateWeek + 1) % weekCycleLen;
        } else {
          templateWeek = 1 - templateWeek;
        }
      }
    }
    return { demandsCount, assignmentsCount };
  }, [startDate, endDate, template, startWeekNumber]);

  const totalDays = startDate && endDate ? endDate.diff(startDate, 'day') + 1 : 0;

  const handleApply = async () => {
    setError('');

    if (!startDate || !endDate) {
      setError(t('date_range_required'));
      return;
    }

    if (endDate.isBefore(startDate)) {
      setError(t('end_date_before_start_date'));
      return;
    }

    const daysDiff = endDate.diff(startDate, 'day') + 1;
    if (daysDiff > SCHEDULE_TEMPLATE_CONSTRAINTS.MAX_DATE_RANGE_DAYS) {
      setError(t('date_range_too_long'));
      return;
    }

    setIsApplying(true);
    try {
      const request: ApplyScheduleTemplateToDateRangeDTO = {
        templateId: template.id,
        startDate: startDate.startOf('day').unix(),
        endDate: endDate.endOf('day').unix(),
        startWeekNumber,
        overwriteDemands,
        overwriteAssignments,
      };

      const result = await onApply(request);
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('template_application_failed'));
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isApplying && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('apply_template')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</div>
          )}

          <div className="rounded-md bg-muted p-3 text-sm">
            <span className="font-medium">{template.name}</span>
            <span className="ml-2 text-muted-foreground">
              {template.templateType === TemplateType.EVEN_ODD ? t('even_odd') : t('standard')}
              {' · '}
              {template.weeksData.length} {t('weeks').toLowerCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('start_date')}</Label>
              <DatePicker
                value={startDate}
                onChange={(d) => {
                  setStartDate(d);
                  if (d && endDate && endDate.isBefore(d)) setEndDate(d);
                }}
                minDate={dayjs.utc().startOf('day')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('end_date')}</Label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                minDate={startDate || dayjs.utc().startOf('day')}
              />
            </div>
          </div>

          {template.templateType === TemplateType.STANDARD && template.weeksData.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('start_from_week')}</Label>
              <Select
                value={String(startWeekNumber)}
                onValueChange={(v) => setStartWeekNumber(Number(v))}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="overwrite-demands"
                checked={overwriteDemands}
                onCheckedChange={(v) => setOverwriteDemands(!!v)}
              />
              <Label htmlFor="overwrite-demands" className="cursor-pointer text-sm">
                {t('overwrite_demands')}
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="overwrite-assignments"
                checked={overwriteAssignments}
                onCheckedChange={(v) => setOverwriteAssignments(!!v)}
              />
              <Label htmlFor="overwrite-assignments" className="cursor-pointer text-sm">
                {t('overwrite_assignments')}
              </Label>
            </div>
          </div>

          {estimatedStats && (
            <div className="grid grid-cols-3 gap-2 rounded-md bg-muted p-3 text-xs">
              <div>
                <span className="text-muted-foreground">{t('total_days')}</span>
                <p className="font-medium">{totalDays}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('estimated_demands')}</span>
                <p className="font-medium">{estimatedStats.demandsCount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('estimated_assignments')}</span>
                <p className="font-medium">{estimatedStats.assignmentsCount}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isApplying}>
            {t('cancel')}
          </Button>
          <Button onClick={handleApply} disabled={isApplying}>
            {isApplying ? t('applying') : t('apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
