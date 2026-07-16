'use client';

import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from '../../app/i18n/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import type { Dayjs } from 'dayjs';
import type { PeriodT } from '../../types/schedule';

interface ConstraintPeriodDialogProps {
  lng: string;
  open: boolean;
  onClose: () => void;
  onSave: (period: PeriodT | null) => void;
  initialPeriod: PeriodT | null;
  campaignStart: Dayjs;
  campaignEnd: Dayjs;
}

export default function ConstraintPeriodDialog({
  lng,
  open,
  onClose,
  onSave,
  initialPeriod,
  campaignStart,
  campaignEnd,
}: ConstraintPeriodDialogProps) {
  const { t } = useTranslation(lng, 'campaign-page');
  const [entireCampaign, setEntireCampaign] = useState(true);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  useEffect(() => {
    if (open) {
      if (initialPeriod) {
        setEntireCampaign(false);
        setStartDate(initialPeriod.startDate);
        setEndDate(initialPeriod.endDate);
      } else {
        setEntireCampaign(true);
        setStartDate(null);
        setEndDate(null);
      }
    }
  }, [open, initialPeriod]);

  const handleEntireCampaignChange = (checked: boolean) => {
    setEntireCampaign(checked);
    if (checked) {
      setStartDate(null);
      setEndDate(null);
    }
  };

  const handleSave = () => {
    if (entireCampaign) {
      onSave(null);
    } else if (startDate && endDate) {
      const start = startDate.startOf('day');
      const end = endDate.startOf('day');
      const clampedStart = start.isBefore(campaignStart) ? campaignStart : start;
      const clampedEnd = end.isAfter(campaignEnd) ? campaignEnd : end;
      if (clampedStart.isAfter(clampedEnd)) return;
      onSave({ startDate: clampedStart, endDate: clampedEnd });
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('effective_period_dialog_title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={entireCampaign}
              onCheckedChange={(checked) => handleEntireCampaignChange(!!checked)}
              id="entire-campaign"
            />
            <label htmlFor="entire-campaign" className="cursor-pointer text-sm select-none">
              {t('entire_campaign')}
            </label>
          </div>

          {!entireCampaign && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">{t('effective_period_from')}</span>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  minDate={dayjs.utc(campaignStart.format('YYYY-MM-DD'))}
                  maxDate={dayjs.utc(campaignEnd.format('YYYY-MM-DD'))}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">{t('effective_period_to')}</span>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  minDate={dayjs.utc(campaignStart.format('YYYY-MM-DD'))}
                  maxDate={dayjs.utc(campaignEnd.format('YYYY-MM-DD'))}
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!entireCampaign && (!startDate || !endDate)}>
              {t('set')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
