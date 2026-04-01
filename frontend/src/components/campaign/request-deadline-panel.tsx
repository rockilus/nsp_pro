import React, { useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from '../../app/i18n/client';
// MUI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
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
  onReminderSent: () => void;
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
  const [reminderSnackbarOpen, setReminderSnackbarOpen] = useState(false);

  const currentDeadline = scheduleCampaign.requestDeadline;
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
      await sendReminder(scheduleCampaign.id, scheduleCampaign.teamId);
      setReminderSnackbarOpen(true);
      onReminderSent();
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
    <Box data-testid="request-deadline-panel" sx={{ mt: 2, mb: 1 }}>
      {currentDeadline ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('current_deadline')}: <strong>{currentDeadline.format('MMM D, YYYY')}</strong>
          </Typography>
          <Button
            variant="outlined"
            size="small"
            data-testid="send-reminder-button"
            onClick={handleSendReminder}
          >
            {t('send_reminder')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            data-testid="extend-deadline-button"
            onClick={() => setExtendDialogOpen(true)}
          >
            {t('extend_deadline')}
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('no_deadline_set')}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            data-testid="set-deadline-button"
            onClick={() => setSetDialogOpen(true)}
          >
            {t('set_deadline')}
          </Button>
        </Box>
      )}

      {/* Set deadline dialog */}
      <Dialog
        open={setDialogOpen}
        onClose={() => setSetDialogOpen(false)}
        data-testid="deadline-dialog"
      >
        <DialogTitle>{t('deadline_dialog_title')}</DialogTitle>
        <DialogContent>
          <TextField
            type="date"
            value={deadlineInput}
            onChange={(e) => setDeadlineInput(e.target.value)}
            inputProps={{ min: today }}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSetDialogOpen(false)}>{t('cancel') || 'Cancel'}</Button>
          <Button
            variant="contained"
            onClick={handleSetDeadline}
            disabled={isSaving || !deadlineInput}
          >
            {t('set_deadline')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Extend deadline dialog */}
      <Dialog
        open={extendDialogOpen}
        onClose={() => setExtendDialogOpen(false)}
        data-testid="extend-deadline-dialog"
      >
        <DialogTitle>{t('extend_deadline_dialog_title')}</DialogTitle>
        <DialogContent>
          <TextField
            type="date"
            value={extendInput}
            onChange={(e) => setExtendInput(e.target.value)}
            inputProps={{ min: minExtend }}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtendDialogOpen(false)}>{t('cancel') || 'Cancel'}</Button>
          <Button
            variant="contained"
            onClick={handleExtendDeadline}
            disabled={isSaving || !extendInput}
          >
            {t('extend_deadline')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={reminderSnackbarOpen}
        autoHideDuration={4000}
        onClose={() => setReminderSnackbarOpen(false)}
        message={t('reminder_sent') || 'Reminder sent'}
        data-testid="reminder-sent-snackbar"
      />
    </Box>
  );
}
