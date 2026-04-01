'use client';

import SettingsLayout from '@/components/settings/settings-layout';
import MobileNavAppBar from '@/components/app-bar/mobile-nav-app-bar';
import { useIsMobile } from '@/hooks/useIsMobile';
import React from 'react';

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
}) {
  const resolvedParams = React.use(params as Promise<{ lng: string }>);
  const isMobile = useIsMobile();

  return (
    <>
      {isMobile && <MobileNavAppBar lng={resolvedParams.lng} />}
      <SettingsLayout params={resolvedParams}>{children}</SettingsLayout>
    </>
  );
}
