'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import AdminUserDetailsTab from '@/components/admin/admin-user-details-tab';
import { Loader2 } from 'lucide-react';

function DetailsContent({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, 'admin-user-details');
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  if (!userId) {
    return (
      <div
        data-testid="admin-user-details-no-user-id"
        className="flex items-center justify-center py-20"
      >
        <p className="text-muted-foreground">{t('noUserId')}</p>
      </div>
    );
  }

  return <AdminUserDetailsTab lng={lng} userId={userId} />;
}

export default function AdminUserDetailsPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params as Promise<{ lng: string }>);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DetailsContent lng={lng} />
    </Suspense>
  );
}
