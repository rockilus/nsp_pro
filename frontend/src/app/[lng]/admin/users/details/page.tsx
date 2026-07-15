'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminUserDetailsTab from '@/components/admin/admin-user-details-tab';
import { Loader2 } from 'lucide-react';

function DetailsContent({ lng }: { lng: string }) {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  if (!userId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No user ID provided.</p>
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
