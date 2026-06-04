'use client';

import * as React from 'react';
import MobileNavAppBar from '@/components/app-bar/mobile-nav-app-bar';

export default function MobileWorkerTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  return (
    <>
      <MobileNavAppBar lng={lng} />
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center p-3">
        <p className="text-xl text-muted-foreground">Coming soon</p>
      </div>
    </>
  );
}
