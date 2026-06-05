'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useUser } from '@/context/UserContext';
import { env } from '@/config/env';

interface SuperAdminGuardProps {
  children: React.ReactNode;
  lng: string;
}

export default function SuperAdminGuard({ children, lng }: SuperAdminGuardProps) {
  const { user, loading } = useUser();
  const router = useRouter();

  // In development mode, any authenticated user is treated as super_admin
  // because the dev database user may not have system_role set.
  const isSuperAdmin = env.isDevelopment || user?.systemRole === 'super_admin';

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.replace(`/${lng}/plan/schedule`);
    }
  }, [loading, isSuperAdmin, lng, router]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isSuperAdmin) {
    // Redirect is in-flight; render nothing to prevent a flash of admin UI
    return null;
  }

  return <>{children}</>;
}
