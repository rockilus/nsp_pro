'use client';

import React from 'react';
// Styles
import '../../../../../styles/page.css';
// Components
import SecurityTab from '@/components/settings/security/security-tab';

export default function SecurityPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params as Promise<{ lng: string }>);
  return (
    <div className="page-layout">
      <SecurityTab lng={lng} />
    </div>
  );
}
