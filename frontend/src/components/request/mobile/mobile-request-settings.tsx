import React from 'react';
import { useTranslation } from '../../../app/i18n/client';
// MUI
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { WorkerT } from '@/types/worker';

interface MobileRequestSettingsProps {
  open: boolean;
  onClose: () => void;
  workers: WorkerT[];
  selectedWorkerId: string | null;
  onWorkerChange: (workerId: string) => void;
  showPastRequests: boolean;
  onShowPastRequestsChange: (show: boolean) => void;
  lng: string;
}

export default function MobileRequestSettings({
  open,
  onClose,
  workers,
  selectedWorkerId,
  onWorkerChange,
  showPastRequests,
  onShowPastRequestsChange,
  lng,
}: MobileRequestSettingsProps) {
  const { t } = useTranslation(lng, 'request-page');

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('settings') || 'Settings'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* Worker Selector */}
          <FormControl fullWidth>
            <InputLabel id="mobile-worker-select-label">{t('worker') || 'Worker'}</InputLabel>
            <Select
              labelId="mobile-worker-select-label"
              value={selectedWorkerId || ''}
              label={t('worker') || 'Worker'}
              onChange={(e) => onWorkerChange(String(e.target.value))}
            >
              {workers
                .filter((w) => !w.deleted)
                .map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {/* Show Past Requests Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={showPastRequests}
                onChange={(e) => onShowPastRequestsChange(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">{t('show_past') || 'Show Past Requests'}</Typography>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('close') || 'Close'}</Button>
      </DialogActions>
    </Dialog>
  );
}
