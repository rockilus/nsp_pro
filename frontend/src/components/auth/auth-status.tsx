'use client';

import React from 'react';
import { useAuth } from '../../contexts/auth-context';
import { Chip, Box } from '@mui/material';

interface AuthStatusProps {
  showDetails?: boolean;
}

export default function AuthStatus({ showDetails = false }: AuthStatusProps) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <Chip label="Loading..." color="default" size="small" />;
  }

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Chip
        label={isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
        color={isAuthenticated ? 'success' : 'error'}
        size="small"
      />
      {showDetails && isAuthenticated && user?.profile?.email && (
        <Chip label={user.profile.email} color="primary" variant="outlined" size="small" />
      )}
    </Box>
  );
}
