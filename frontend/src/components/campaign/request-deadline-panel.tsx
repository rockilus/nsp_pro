import React, { useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { Dayjs } from 'dayjs';
import { toast } from 'sonner';
import { useTranslation } from '../../app/i18n/client';
import { Calendar, Send, Trash2 } from 'lucide-react';
// shadcn/ui
import { Button } from '@/components/ui/button';
import { formatToInput, parseFromInput, formatLocalDate } from '@/lib/date-utils';
// Types
import { ScheduleT } from '../../types/schedule';
// Hooks
import {
  useSetRequestDeadline,
  useSendRequestDeadlineReminder,
  useEditRequestDeadline,
  useDeleteRequestDeadline,
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
  const editRequestDeadline = useEditRequestDeadline();
  const deleteRequestDeadline = useDeleteRequestDeadline();

  const [mode, setMode] = useState<'idle' | 'set' | 'edit'>('idle');
  const [deadlineInput, setDeadlineInput] = useState<Dayjs | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentDeadline = scheduleCampaign.requestDeadline;
  const lastReminderSentAt = scheduleCampaign.lastReminderSentAt;
  const today = dayjs().utc().startOf('day');

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
      setMode('idle');
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
  const handleEditDeadline = async () => {
    if (!deadlineInput) return;
    setIsSaving(true);
    try {
      const newDeadline = deadlineInput.utc().toDate();
      const updated = await editRequestDeadline(
        scheduleCampaign.id,
        scheduleCampaign.teamId,
        newDeadline,
      );
      onDeadlineExtended(updated);
      setMode('idle');
      setDeadlineInput(null);
    } catch (error) {
      console.error('Failed to edit request deadline:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeadline = async () => {
    setIsSaving(true);
    try {
      const updated = await deleteRequestDeadline(scheduleCampaign.id, scheduleCampaign.teamId);
      toast.success(t('deadline_deleted') || 'Deadline deleted');
      // notify parent of the updated schedule
      onDeadlineSet(updated);
    } catch (error) {
      console.error('Failed to delete request deadline:', error);
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
              mode === 'edit' ? (
                <>
                  <input
                    type="date"
                    value={formatToInput(deadlineInput)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeadlineInput(parseFromInput(e.target.value))}
                    min={norm(today)}
                    className={dateInputClass}
                  />
                  <Button variant="brand" size="sm" onClick={handleEditDeadline} disabled={isSaving || !deadlineInput}>
                    {t('set_deadline')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setMode('idle'); setDeadlineInput(null); }}>
                    {t('cancel') || 'Cancel'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatLocalDate(currentDeadline, lng)}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid="edit-deadline-button"
                        onClick={() => { setMode('edit'); setDeadlineInput(currentDeadline); }}
                        aria-label={t('edit_deadline') || 'Edit deadline'}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid="send-reminder-icon-button"
                        onClick={handleSendReminder}
                        aria-label={t('send_reminder') || 'Send reminder'}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid="delete-deadline-button"
                        onClick={handleDeleteDeadline}
                        aria-label={t('delete_deadline') || 'Delete deadline'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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
                </>
              )
            ) : (
              mode === 'set' ? (
                <>
                  <input
                    type="date"
                    value={formatToInput(deadlineInput)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeadlineInput(parseFromInput(e.target.value))}
                    min={norm(today)}
                    className={dateInputClass}
                  />
                  <Button variant="brand" size="sm" onClick={handleSetDeadline} disabled={isSaving || !deadlineInput}>
                    {t('set_deadline')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setMode('idle'); setDeadlineInput(null); }}>
                    {t('cancel') || 'Cancel'}
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="set-deadline-button"
                  onClick={() => { setMode('set'); setDeadlineInput(today); }}
                >
                  {t('set')}
                </Button>
              )
            )}
          </div>
        </div>
      ) : (
        <div data-testid="request-deadline-panel" className="flex items-center gap-2">
          {mode === 'edit' ? (
            <>
              <input
                type="date"
                value={formatToInput(deadlineInput)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeadlineInput(parseFromInput(e.target.value))}
                min={norm(today)}
                className={dateInputClass}
              />
              <Button variant="default" size="sm" onClick={handleEditDeadline} disabled={isSaving || !deadlineInput}>
                {t('set_deadline')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setMode('idle'); setDeadlineInput(null); }}>
                {t('cancel') || 'Cancel'}
              </Button>
            </>
          ) : mode === 'set' ? (
            <>
              <input
                type="date"
                value={formatToInput(deadlineInput)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeadlineInput(parseFromInput(e.target.value))}
                min={norm(today)}
                className={dateInputClass}
              />
              <Button variant="default" size="sm" onClick={handleSetDeadline} disabled={isSaving || !deadlineInput}>
                {t('set_deadline')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setMode('idle'); setDeadlineInput(null); }}>
                {t('cancel') || 'Cancel'}
              </Button>
            </>
          ) : (
            <>
              <span className={currentDeadline ? 'text-sm font-semibold' : 'text-sm text-muted-foreground'}>
                {currentDeadline ? formatLocalDate(currentDeadline, lng) : t('no_deadline_set') || 'No deadline'}
              </span>
              {currentDeadline ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="edit-deadline-button-compact"
                    onClick={() => { setMode('edit'); setDeadlineInput(currentDeadline); }}
                    aria-label={t('edit_deadline') || 'Edit deadline'}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="send-reminder-icon-button-compact"
                    onClick={handleSendReminder}
                    aria-label={t('send_reminder') || 'Send reminder'}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="delete-deadline-button-compact"
                    onClick={handleDeleteDeadline}
                    aria-label={t('delete_deadline') || 'Delete deadline'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="set-deadline-button"
                  onClick={() => { setMode('set'); setDeadlineInput(today); }}
                >
                  {t('set')}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Inline set/extend inputs handled above; dialogs removed */}
    </>
  );
}
