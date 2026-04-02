import React, { useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Dayjs } from 'dayjs';
import { toast } from 'sonner';
import { useTranslation } from '../../app/i18n/client';
// shadcn/ui
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatToInput, parseFromInput, formatLocalDate } from '@/lib/date-utils';
// Types
import { ScheduleT } from '../../types/schedule';
// Hooks
import {
  useSetRequestDeadline,
  useSendRequestDeadlineReminder,
  useExtendRequestDeadline,
} from '../../hooks/useSchedule';

interface RequestDeadlinePanelProps {
  scheduleCampaign: ScheduleT;
  onDeadlineSet: (schedule: ScheduleT) => void;
  onDeadlineExtended: (schedule: ScheduleT) => void;
  onReminderSent: (schedule: ScheduleT) => void;
  lng: string;
  compact?: boolean;
}

dayjs.extend(utc);

export default function RequestDeadlinePanel({
  scheduleCampaign,
  onDeadlineSet,
  onDeadlineExtended,
  onReminderSent,
  lng,
  compact = false,
}: RequestDeadlinePanelProps) {
  const { t } = useTranslation(lng, 'campaign-page');
  const setRequestDeadline = useSetRequestDeadline();
  const sendReminder = useSendRequestDeadlineReminder();
  const extendRequestDeadline = useExtendRequestDeadline();

  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState<Dayjs | null>(null);
  const [extendInput, setExtendInput] = useState<Dayjs | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentDeadline = scheduleCampaign.requestDeadline;
  const lastReminderSentAt = scheduleCampaign.lastReminderSentAt;
  const today = dayjs().utc().startOf('day');
  const minExtend = currentDeadline ? currentDeadline.add(1, 'day') : today;

  const norm = (d?: Dayjs | string | null) => {
    if (!d) return undefined;
    return typeof d === 'string' ? d : (d as Dayjs).utc().format('YYYY-MM-DD');
  };
  const dateInputClass =
    'h-9 w-40 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

  const handleSetDeadline = async () => {
    if (!deadlineInput) return;
    setIsSaving(true);
    try {
      const deadline = deadlineInput.utc().toDate();
      const updated = await setRequestDeadline(
        scheduleCampaign.id,
        scheduleCampaign.teamId,
        deadline,
      );
      onDeadlineSet(updated);
      setSetDialogOpen(false);
      setDeadlineInput(null);
    } catch (error) {
      console.error('Failed to set request deadline:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendReminder = async () => {
    try {
      const updated = await sendReminder(scheduleCampaign.id, scheduleCampaign.teamId);
      toast.success(t('reminder_sent') || 'Reminder sent');
      onReminderSent(updated);
    } catch (error) {
      console.error('Failed to send reminder:', error);
    }
  };

  const handleExtendDeadline = async () => {
    if (!extendInput) return;
    setIsSaving(true);
    try {
      const newDeadline = extendInput.utc().toDate();
      const updated = await extendRequestDeadline(
        scheduleCampaign.id,
        scheduleCampaign.teamId,
        newDeadline,
      );
      onDeadlineExtended(updated);
      setExtendDialogOpen(false);
      setExtendInput(null);
    } catch (error) {
      console.error('Failed to extend deadline:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {!compact ? (
        <div
          data-testid="request-deadline-panel"
          className="py-2 px-3 flex min-h-[45px] flex-row items-center max-w-[440px]"
        >
          <div className="flex w-[120px] items-center">
            <span className="text-sm text-[#3c4043]">{t('request_deadline')}</span>
          </div>
          <div className="gap-2 flex flex-1 flex-wrap items-center">
            {currentDeadline ? (
              <>
                <span className="text-sm font-semibold">{formatLocalDate(currentDeadline, lng)}</span>
                <div className="flex flex-col items-start">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="send-reminder-button"
                    onClick={handleSendReminder}
                  >
                    {t('send_reminder')}
                  </Button>
                  {lastReminderSentAt && (
                    <span className="text-xs mt-0.5 text-muted-foreground">
                      {t('last_sent')}: {formatLocalDate(lastReminderSentAt, lng)}
                    </span>
                  )}
                </div>
                <Button
                  variant="default"
                  size="sm"
                  data-testid="extend-deadline-button"
                  onClick={() => setExtendDialogOpen(true)}
                >
                  {t('extend_deadline')}
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                data-testid="set-deadline-button"
                onClick={() => setSetDialogOpen(true)}
              >
                {t('set_deadline_for_requests')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div data-testid="request-deadline-panel" className="flex items-center gap-2">
          {currentDeadline ? (
            <>
              <Button
                variant="outline"
                size="sm"
                data-testid="send-reminder-button"
                onClick={handleSendReminder}
              >
                {t('send_reminder')}
              </Button>
              <Button
                variant="default"
                size="sm"
                data-testid="extend-deadline-button"
                onClick={() => setExtendDialogOpen(true)}
              >
                {t('extend_deadline')}
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              data-testid="set-deadline-button"
              onClick={() => setSetDialogOpen(true)}
            >
              {t('set_deadline_for_requests')}
            </Button>
          )}
        </div>
      )}

      {/* Set deadline dialog */}
      <Dialog open={setDialogOpen} onOpenChange={setSetDialogOpen}>
        <DialogContent className="w-4/5 md:w-1/2" data-testid="deadline-dialog" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('deadline_dialog_title')}</DialogTitle>
          </DialogHeader>
          <input
            type="date"
            value={formatToInput(deadlineInput)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeadlineInput(parseFromInput(e.target.value))}
            min={norm(today)}
            className={dateInputClass}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetDialogOpen(false)}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="brand" onClick={handleSetDeadline} disabled={isSaving || !deadlineInput}>
              {t('set_deadline')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend deadline dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="w-4/5 md:w-1/2" data-testid="extend-deadline-dialog" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('extend_deadline_dialog_title')}</DialogTitle>
          </DialogHeader>
          <input
            type="date"
            value={formatToInput(extendInput)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtendInput(parseFromInput(e.target.value))}
            min={norm(minExtend)}
            className={dateInputClass}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button variant="brand" onClick={handleExtendDeadline} disabled={isSaving || !extendInput}>
              {t('extend_deadline')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
