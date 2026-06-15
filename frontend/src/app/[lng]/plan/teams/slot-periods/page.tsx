'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import SlotPeriodsTab from '@/components/teams-settings/slot-periods/slot-periods-tab';
import '@/styles/page.css';

export default function Page({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = React.use(params as Promise<{ lng: string }>);
  const searchParams = useSearchParams();
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-600">Error: Team ID is required</div>
      </div>
    );
  }

  return (
    <div className="page-layout">
      <SlotPeriodsTab lng={lng} selectedTeamId={teamId} />
    </div>
  );
}
