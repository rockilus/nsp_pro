import React, { useState } from 'react';
import dayjs from 'dayjs';
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
import { Input } from '@/components/ui/input';
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
}

export default function RequestDeadlinePanel({
  scheduleCampaign,
  onDeadlineSet,
  onDeadlineExtended,
  onReminderSent,
  lng,
}: RequestDeadlinePanelProps) {
  const { t } = useTranslation(lng, 'campaign-page');
  const setRequestDeadline = useSetRequestDeadline();
  const sendReminder = useSendRequestDeadlineReminder();
  const extendRequestDeadline = useExtendRequestDeadline();

  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [extendInput, setExtendInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentDeadline = scheduleCampaign.requestDeadline;
  const lastReminderSentAt = scheduleCampaign.lastReminderSentAt;
  const today = dayjs().utc().format('YYYY-MM-DD');
  const minExtend = currentDeadline ? currentDeadline.add(1, 'day').format('YYYY-MM-DD') : today;

  const handleSetDeadline = async () => {
    if (!deadlineInput) return;
    setIsSaving(true);
    try {
      const deadline = new Date(deadlineInput);
      const updated = await setRequestDeadline(
        scheduleCampaign.id,
        scheduleCampaign.teamId,
        deadline,
      );
      onDeadlineSet(updated);
      setSetDialogOpen(false);
      setDeadlineInput('');
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
      const newDeadline = new Date(extendInput);
      const updated = await extendRequestDeadline(
        scheduleCampaign.id,
        scheduleCampaign.teamId,
        newDeadline,
      );
      onDeadlineExtended(updated);
      setExtendDialogOpen(false);
      setExtendInput('');
    } catch (error) {
      console.error('Failed to extend deadline:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        data-testid="request-deadline-panel"
        className="py-0.5 flex min-h-[45px] flex-row items-center"
      >
        <div className="flex w-[150px] items-center">
          <span className="text-sm text-[#3c4043]">{t('request_deadline')}</span>
        </div>
        <div className="gap-2 flex flex-1 flex-wrap items-center">
          {currentDeadline ? (
            <>
              <span className="text-sm font-semibold">{currentDeadline.format('MMM D, YYYY')}</span>
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
                    {t('last_sent')}: {lastReminderSentAt.format('MMM D, YYYY')}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                data-testid="extend-deadline-button"
                onClick={() => setExtendDialogOpen(true)}
              >
                {t('extend_deadline')}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              data-testid="set-deadline-button"
              onClick={() => setSetDialogOpen(true)}
            >
              {t('set_deadline_for_requests')}
            </Button>
          )}
        </div>
      </div>

      {/* Set deadline dialog */}
      <Dialog open={setDialogOpen} onOpenChange={setSetDialogOpen}>
        <DialogContent data-testid="deadline-dialog" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('deadline_dialog_title')}</DialogTitle>
          </DialogHeader>
          <Input
            type="date"
            value={deadlineInput}
            min={today}
            onChange={(e) => setDeadlineInput(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetDialogOpen(false)}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSetDeadline} disabled={isSaving || !deadlineInput}>
              {t('set_deadline')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend deadline dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent data-testid="extend-deadline-dialog" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('extend_deadline_dialog_title')}</DialogTitle>
          </DialogHeader>
          <Input
            type="date"
            value={extendInput}
            min={minExtend}
            onChange={(e) => setExtendInput(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleExtendDeadline} disabled={isSaving || !extendInput}>
              {t('extend_deadline')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
