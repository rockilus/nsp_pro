'use client';

import React from 'react';
import AdminImportTab from '@/components/admin/admin-import-tab';

export default function AdminImportPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params as Promise<{ lng: string }>);

  return <AdminImportTab lng={lng} />;
}
