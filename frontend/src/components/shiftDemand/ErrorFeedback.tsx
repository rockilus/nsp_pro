/**
 * Error feedback component for shift demand operations
 * Provides user-friendly error messages with proper styling and auto-dismiss
 */

import React from 'react';
import { Alert, Snackbar } from '@mui/material';

interface ErrorFeedbackProps {
  error: string | null;
  onClose: () => void;
  severity?: 'error' | 'warning' | 'info' | 'success';
  autoHideDuration?: number;
}

export function ErrorFeedback({
  error,
  onClose,
  severity = 'error',
  autoHideDuration = 6000,
}: ErrorFeedbackProps) {
  return (
    <Snackbar
      open={!!error}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {error}
      </Alert>
    </Snackbar>
  );
}

export default ErrorFeedback;
