'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import { ArrowLeft, Loader2 } from 'lucide-react';
// Components
import AdminUserExportTable from './admin-user-export-table';
// Hooks
import { useAdminUserDetails } from '@/hooks/useAdminUserDetails';
// API Client
import { AdminApi, AdminExportSelection } from '@/app/lib/api/adminApi';
import { ExportApi } from '@/app/lib/api/exportApi';
import { useApiClient } from '@/app/lib/api-client';
// shadcn
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AdminUserDetailsTabProps {
  lng: string;
  userId: string;
}

export default function AdminUserDetailsTab({ lng, userId }: AdminUserDetailsTabProps) {
  const { t } = useTranslation(lng, 'admin-user-details');
  const router = useRouter();
  const apiClient = useApiClient();
  const { details, loading, error } = useAdminUserDetails(userId);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (selections: AdminExportSelection[]) => {
    setExporting(true);
    setExportError(null);
    try {
      const data = await AdminApi.exportUserData(apiClient, userId, selections);
      const blob = new Blob([JSON.stringify(data, null, 4)], {
        type: 'application/json',
      });
      ExportApi.downloadBlob(blob, `user-data-${userId}.json`);
    } catch (err) {
      console.error('Failed to export user data:', err);
      setExportError(err instanceof Error ? err.message : t('exportError'));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div
        data-testid="admin-user-details-loading"
        className="flex items-center justify-center p-8"
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <Alert data-testid="admin-user-details-error" variant="destructive" className="m-2">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error ?? t('loadError')}</AlertDescription>
      </Alert>
    );
  }

  const { user, teams } = details;

  return (
    <div data-testid="admin-user-details-tab" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button
          data-testid="back-to-users-btn"
          variant="outline"
          size="sm"
          onClick={() => router.push(`/${lng}/admin/users`)}
        >
          <ArrowLeft className="size-4" />
          {t('backToUsers')}
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('teamsTitle')}</h2>
        {teams.length === 0 ? (
          <p data-testid="admin-user-no-teams" className="text-sm text-muted-foreground">
            {t('noTeams')}
          </p>
        ) : (
          <ul className="space-y-2">
            {teams.map((team) => (
              <li
                key={team.id}
                data-testid={`admin-user-team-${team.id}`}
                className="flex items-center gap-2 text-sm"
              >
                <span>{team.name}</span>
                <Badge variant="secondary">
                  {t(`roles.${team.role}`, { defaultValue: team.role })}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {teams.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('exportTitle')}</h2>
          {exportError && (
            <Alert data-testid="admin-user-export-error" variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{exportError}</AlertDescription>
            </Alert>
          )}
          <AdminUserExportTable
            lng={lng}
            teams={teams}
            exporting={exporting}
            onExport={handleExport}
          />
        </section>
      )}
    </div>
  );
}
