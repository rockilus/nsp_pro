'use client';

import React, { useState } from 'react';
// MUI
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
// Hooks
import {
  getImpersonationTarget,
  ImpersonationTarget,
  useStopAdminImpersonation,
} from '@/hooks/useAdminImpersonation';
import {
  isImpersonationTokenExpired,
  clearImpersonationTarget,
} from '@/app/lib/impersonation-storage';

/**
 * Sticky banner displayed at the top of every page when an admin is
 * currently accessing another user's account.
 *
 * Reads impersonation state from sessionStorage (written by
 * useStartImpersonationWithTarget) and renders nothing when inactive.
 */
export default function ImpersonationBanner() {
  const [target, setTarget] = useState<ImpersonationTarget | null>(() => {
    const stored = getImpersonationTarget();
    if (stored && isImpersonationTokenExpired()) {
      // Token already expired on load — silently clear so the user isn't stuck
      clearImpersonationTarget();
      return null;
    }
    return stored;
  });
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);

  const stopImpersonation = useStopAdminImpersonation();

  if (!target) return null;

  const handleStop = async () => {
    setStopping(true);
    setStopError(null);
    try {
      await stopImpersonation();
      // Navigation happens inside the hook; clear local state as fallback
      setTarget(null);
    } catch (err) {
      console.error('Failed to stop impersonation:', err);
      setStopError(err instanceof Error ? err.message : 'Failed to stop impersonation');
      setStopping(false);
    }
  };

  return (
    <Box
      data-testid="impersonation-banner"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        width: '100%',
      }}
    >
      <Alert
        severity="warning"
        variant="filled"
        sx={{ borderRadius: 0, py: 0.75 }}
        action={
          <Button
            data-testid="stop-impersonation-btn"
            color="inherit"
            size="small"
            variant="outlined"
            onClick={handleStop}
            disabled={stopping}
            startIcon={stopping ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ ml: 2, whiteSpace: 'nowrap' }}
          >
            {stopping ? 'Stopping…' : 'Stop impersonating'}
          </Button>
        }
      >
        <Typography variant="body2" component="span">
          You are viewing the account of{' '}
          <strong>
            {target.firstName} {target.lastName}
          </strong>{' '}
          ({target.email})
        </Typography>
        {stopError && (
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            {stopError}
          </Typography>
        )}
      </Alert>
    </Box>
  );
}
