'use client';

import React from 'react';
import NotificationsPage from '@/components/notifications/notifications-page';
import '@/styles/page.css';

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params as Promise<{ lng: string }>);
  return (
    <div className="page-layout">
      <NotificationsPage lng={lng} />
    </div>
  );
}
