'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import { Loader2 } from 'lucide-react';
import AdminUsersTable from './admin-users-table';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useStartImpersonationWithTarget } from '@/hooks/useAdminImpersonation';
// shadcn
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// Types
import { UserT } from '@/types/user';

interface AdminUsersTabProps {
  lng: string;
}

export default function AdminUsersTab({ lng }: AdminUsersTabProps) {
  const { t } = useTranslation(lng, 'admin-users');
  const router = useRouter();
  const { users, loading, error } = useAdminUsers();
  const startImpersonation = useStartImpersonationWithTarget();
  const [accessError, setAccessError] = useState<string | null>(null);

  const handleViewDetails = (userId: string) => {
    router.push(`/${lng}/admin/users/details?userId=${userId}`);
  };

  const handleAccessAccount = async (userId: string) => {
    const target = users.find((u: UserT) => u.id === userId);
    if (!target) return;

    setAccessError(null);
    try {
      await startImpersonation({
        userId: target.id,
        firstName: target.firstName,
        lastName: target.lastName,
        email: target.email,
        language: target.language,
      });
    } catch (err) {
      console.error('Failed to access account:', err);
      setAccessError(err instanceof Error ? err.message : 'Failed to access account');
    }
  };

  if (loading) {
    return (
      <div data-testid="admin-users-loading" className="flex items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert data-testid="admin-users-error" variant="destructive" className="m-2">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div data-testid="admin-users-tab">
      <h1 className="mb-4 text-xl font-semibold">{t('title')}</h1>
      {accessError && (
        <Alert data-testid="admin-access-error" variant="destructive" className="mb-3">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{accessError}</AlertDescription>
        </Alert>
      )}
      <AdminUsersTable
        lng={lng}
        users={users}
        onAccessAccount={handleAccessAccount}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
}
