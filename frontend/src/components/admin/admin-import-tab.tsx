'use client';

import React, { useCallback, useState } from 'react';
import { useTranslation } from '@/app/i18n/client';
// Components
import AdminImportList from './admin-import-list';
import AdminImportCreateDialog from './admin-import-create-dialog';

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminImportTab({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'admin-import');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">{t('title')}</h1>

      <AdminImportList lng={lng} onOpenCreate={() => setDialogOpen(true)} refreshKey={refreshKey} />

      <AdminImportCreateDialog
        lng={lng}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
